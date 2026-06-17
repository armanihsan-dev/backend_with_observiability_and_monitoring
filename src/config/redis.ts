import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

export const connectRedis = async () => {
    try {
        redisClient = createClient({
            url: process.env.REDIS_URL || 'redis://localhost:6379',
            socket: {
                reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
            },
            RESP: 2
        }) as RedisClientType;

        redisClient.on('error', (err) => {
            console.error('Redis error:', err);
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        await redisClient.connect();
        return redisClient;
    } catch (error) {
        console.error('❌ Redis connection failed:', error);
        throw error;
    }
};

export const getRedisClient = () => {
    if (!redisClient) {
        throw new Error('Redis not initialized. Call connectRedis() first.');
    }
    return redisClient;
};