import { Request, Response, NextFunction } from 'express';
import { redisService } from '../services/redis.service';

export const rateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `rate_limit:${ip}`;
      
      const current = await redisService.get<number>(key);
      
      if (current === null) {
        await redisService.set(key, 1, Math.ceil(windowMs / 1000));
        return next();
      }
      
      if (current >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }
      
      await redisService.set(key, current + 1, Math.ceil(windowMs / 1000));
      next();
    } catch (error) {
      next(error);
    }
  };
};