// middlewares/cache.js
import client from '../db/redis.js';

export const cacheMiddleware = (keyBuilder, ttl = 60) => {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);

      const cachedData = await client.get(key);
      if (cachedData) {
        console.log(`🔥 Redis cache hit for ${key}`);
        return res.json(JSON.parse(cachedData));
      }

      // Save res.json to intercept response and store in cache
      const originalJson = res.json.bind(res);
      res.json = data => {
        client.setEx(key, ttl, JSON.stringify(data));
        return originalJson(data);
      };

      next();
    } catch (err) {
      console.error('Redis cache error:', err);
      next(); // fail gracefully
    }
  };
};
