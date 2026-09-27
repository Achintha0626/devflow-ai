const Redis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const createWorkerRedisConnection = () => new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

const createProducerRedisConnection = () => new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
  retryStrategy: (attempt) => (attempt <= 1 ? 100 : null),
});

module.exports = {
  createWorkerRedisConnection,
  createProducerRedisConnection,
};
