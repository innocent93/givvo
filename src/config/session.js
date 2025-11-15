// src/config/session.js
// Environment-aware session setup (Redis preferred, Mongo fallback).
// Exports an async function `setupSession(app)` that mounts express-session.

import session from 'express-session';
import process from 'process';

const DEFAULT_SESSION_NAME = process.env.SESSION_NAME || 'sid';
const DEFAULT_SECRET =
  process.env.SESSION_SECRET || 'replace-with-secure-secret';
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 14);
const SESSION_MAX_AGE = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000; // ms

const cookieConfig = {
  maxAge: SESSION_MAX_AGE,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // require HTTPS in prod
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
};

const baseSessionOptions = {
  name: DEFAULT_SESSION_NAME,
  secret: DEFAULT_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // refresh session expiry on each request
  cookie: cookieConfig,
};

function findFirstFunction(obj) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === 'function') return { key, fn: val };
  }
  return null;
}

export async function setupSession(app) {
  let storeUsed = 'memory';

  // Try Redis first (preferred)
  if (process.env.REDIS_URL) {
    try {
      const connectRedisModule = await import('connect-redis').catch(
        () => null
      );
      if (!connectRedisModule)
        throw new Error('connect-redis module not found');

      // Normalize candidate
      let candidate = connectRedisModule;
      if (typeof candidate === 'object' && candidate.default)
        candidate = candidate.default;

      // If candidate is function, great; otherwise try to find a function property.
      let connectRedisFactory =
        typeof candidate === 'function' ? candidate : null;

      if (!connectRedisFactory && typeof candidate === 'object') {
        const found = findFirstFunction(candidate);
        if (found) connectRedisFactory = found.fn;
        else {
          const foundTop = findFirstFunction(connectRedisModule);
          if (foundTop) connectRedisFactory = foundTop.fn;
        }
      }

      if (!connectRedisFactory || typeof connectRedisFactory !== 'function') {
        const shape = obj =>
          Object.keys(obj || {}).reduce((acc, k) => {
            acc[k] = typeof obj[k];
            return acc;
          }, {});
        const msg = `connect-redis import shape unexpected. moduleKeys=${JSON.stringify(
          shape(connectRedisModule)
        )}, candidateKeys=${JSON.stringify(shape(candidate))}`;
        throw new Error(msg);
      }

      // import redis client
      const redisModule = await import('redis');
      const createClient =
        redisModule.createClient || redisModule.default?.createClient;
      if (typeof createClient !== 'function') {
        throw new Error(
          'redis.createClient not found. Ensure "redis" package is installed.'
        );
      }

      const redisClient = createClient({
        url: process.env.REDIS_URL,
        legacyMode: true,
      });

      redisClient.on('error', err => {
        // eslint-disable-next-line no-console
        console.warn(
          'Redis client error',
          err && err.message ? err.message : err
        );
      });

      await redisClient.connect();

      // Determine correct way to obtain RedisStore:
      // - Some versions export a factory function that accepts `session` and returns a Store class.
      // - Others export a Store class directly.
      let RedisStoreClass = null;
      try {
        // Try factory variant first
        const maybe = connectRedisFactory(session);
        // If it returns a function/class, use that.
        if (typeof maybe === 'function') {
          RedisStoreClass = maybe;
        } else if (
          maybe &&
          typeof maybe === 'object' &&
          typeof maybe.constructor === 'function'
        ) {
          // some bundlers might return a wrapped object with constructor
          RedisStoreClass = maybe.constructor;
        } else {
          // not a direct function — fallback to using connectRedisFactory directly below
          RedisStoreClass = null;
        }
      } catch (innerErr) {
        // If we get "Class constructor RedisStore cannot be invoked without 'new'"
        // it means connectRedisFactory is already the class — use it directly.
        const msg = String(
          innerErr && innerErr.message ? innerErr.message : innerErr
        );
        if (
          msg.includes('cannot be invoked without') ||
          msg.includes('Class constructor')
        ) {
          // connectRedisFactory is probably the class — use it as-is
          RedisStoreClass = connectRedisFactory;
        } else {
          // other error — rethrow to be handled by outer catch
          throw innerErr;
        }
      }

      if (!RedisStoreClass || typeof RedisStoreClass !== 'function') {
        // Final attempt: if connectRedisFactory itself looks like a class/function, use it.
        if (typeof connectRedisFactory === 'function') {
          RedisStoreClass = connectRedisFactory;
        } else {
          throw new Error(
            'Unable to resolve RedisStore constructor from connect-redis export.'
          );
        }
      }

      // instantiate store using new (RedisStoreClass is a class/constructor)
      const redisStore = new RedisStoreClass({
        client: redisClient,
        prefix: process.env.SESSION_REDIS_PREFIX || 'sess:',
        ttl: Math.floor(SESSION_MAX_AGE / 1000),
        disableTouch: false,
      });

      app.use(
        session({
          ...baseSessionOptions,
          store: redisStore,
        })
      );

      storeUsed = 'redis';
      // eslint-disable-next-line no-console
      console.info('Session store: Redis');
      return { storeUsed };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'Redis session setup failed:',
        err && err.message ? err.message : err
      );
      // fall through to try mongo
    }
  }

  // Try Mongo as fallback
  if (process.env.MONGO_URI) {
    try {
      const connectMongoModule = await import('connect-mongo');
      const MongoStoreFactory =
        connectMongoModule.default || connectMongoModule;
      const mongoStore = MongoStoreFactory.create({
        mongoUrl: process.env.MONGO_URI,
        ttl: SESSION_TTL_DAYS * 24 * 60 * 60, // seconds
        autoRemove: 'native',
        touchAfter: Number(
          process.env.SESSION_TOUCH_AFTER_SECONDS || 24 * 3600
        ),
      });

      app.use(
        session({
          ...baseSessionOptions,
          store: mongoStore,
        })
      );

      storeUsed = 'mongo';
      // eslint-disable-next-line no-console
      console.info('Session store: MongoDB (connect-mongo)');
      return { storeUsed };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        'Mongo session setup failed:',
        err && err.message ? err.message : err
      );
      // fall through
    }
  }

  // Final fallback — MemoryStore (dev only)
  // WARNING logged so production deployers won't miss it
  // eslint-disable-next-line no-console
  console.error(
    'WARNING: No Redis or Mongo session store configured. Using MemoryStore. This is NOT suitable for production.'
  );

  app.use(session(baseSessionOptions));
  return { storeUsed };
}

export default setupSession;
