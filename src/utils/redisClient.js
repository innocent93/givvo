import Redis from 'ioredis';

// Use your Render Redis URL
const redis = new Redis(
  'redis://default:<PASSWORD>@carhub-9pj8.onrender.com:6379',
  {
    tls: {}, // Render requires TLS for Redis
  }
);

redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', err => {
  console.error('❌ Redis error:', err);
});

export default redis;
