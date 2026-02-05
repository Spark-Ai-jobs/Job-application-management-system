import { createClient, RedisClientType } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const client: RedisClientType = createClient({
  url: REDIS_URL,
});

client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

client.on('connect', () => {
  console.log('Redis client connected');
});

// Connect immediately
client.connect().catch(console.error);

export const redis = {
  // Basic operations
  get: (key: string) => client.get(key),
  set: (key: string, value: string, options?: { EX?: number }) =>
    options?.EX ? client.setEx(key, options.EX, value) : client.set(key, value),
  del: (key: string) => client.del(key),
  exists: (key: string) => client.exists(key),
  expire: (key: string, seconds: number) => client.expire(key, seconds),

  // JSON operations (store objects)
  setJSON: async <T>(key: string, value: T, ttlSeconds?: number) => {
    const json = JSON.stringify(value);
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, json);
    } else {
      await client.set(key, json);
    }
  },

  getJSON: async <T>(key: string): Promise<T | null> => {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  },

  // List operations (for queues)
  lpush: (key: string, value: string) => client.lPush(key, value),
  rpush: (key: string, value: string) => client.rPush(key, value),
  lpop: (key: string) => client.lPop(key),
  rpop: (key: string) => client.rPop(key),
  lrange: (key: string, start: number, stop: number) => client.lRange(key, start, stop),
  llen: (key: string) => client.lLen(key),

  // Set operations (for tracking)
  sadd: (key: string, member: string) => client.sAdd(key, member),
  srem: (key: string, member: string) => client.sRem(key, member),
  smembers: (key: string) => client.sMembers(key),
  sismember: (key: string, member: string) => client.sIsMember(key, member),

  // Hash operations (for user sessions)
  hset: (key: string, field: string, value: string) => client.hSet(key, field, value),
  hget: (key: string, field: string) => client.hGet(key, field),
  hgetall: (key: string) => client.hGetAll(key),
  hdel: (key: string, field: string) => client.hDel(key, field),

  // Pub/Sub
  publish: (channel: string, message: string) => client.publish(channel, message),
  subscribe: (channel: string, callback: (message: string) => void) => {
    const subscriber = client.duplicate();
    subscriber.connect().then(() => {
      subscriber.subscribe(channel, callback);
    });
    return subscriber;
  },

  // Utility
  ping: () => client.ping(),
  keys: (pattern: string) => client.keys(pattern),
  flushAll: () => client.flushAll(),

  // Raw client for advanced operations
  client,
};
