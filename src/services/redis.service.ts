import { getRedisClient } from '../config/redis';
import { redisOperationDuration } from '../config/metrics';



export class RedisService {
    private static instance: RedisService;
    private readonly defaultTTL = 3600; // 1 hour

    static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    async get<T>(key: string): Promise<T | null> {
        const startTime = Date.now();
        try {
            const client = getRedisClient();
            const data = await client.get(key);

            redisOperationDuration
                .labels('get')
                .observe((Date.now() - startTime) / 1000);

            if (!data) return null;
            return JSON.parse(data) as T;
        } catch (error) {
            redisOperationDuration
                .labels('get_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Redis get error:', error);
            return null;
        }
    }

    async set<T>(key: string, value: T, ttl: number = this.defaultTTL): Promise<boolean> {
        const startTime = Date.now();
        try {
            const client = getRedisClient();
            // 2. Store with expiration time (TTL = Time To Live)
            await client.setEx(key, ttl, JSON.stringify(value));

            redisOperationDuration
                .labels('set')
                .observe((Date.now() - startTime) / 1000);

            return true;
        } catch (error) {
            redisOperationDuration
                .labels('set_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Redis set error:', error);
            return false;
        }
    }

    async delete(key: string): Promise<boolean> {
        const startTime = Date.now();
        try {
            const client = getRedisClient();
            await client.del(key);

            redisOperationDuration
                .labels('delete')
                .observe((Date.now() - startTime) / 1000);

            return true;
        } catch (error) {
            redisOperationDuration
                .labels('delete_error')
                .observe((Date.now() - startTime) / 1000);
            console.error('Redis delete error:', error);
            return false;
        }
    }

    async cache<T>(
        key: string,
        fetchFn: () => Promise<T>,
        ttl: number = this.defaultTTL
    ): Promise<T> {
        // Try to get from cache
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Fetch from source
        const data = await fetchFn();

        // Store in cache
        await this.set(key, data, ttl);

        return data;
    }
}

export const redisService = RedisService.getInstance();