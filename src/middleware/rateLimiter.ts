import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

export const rateLimitMiddleware = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    if (!store[key]) {
      store[key] = { count: 1, resetTime: now + windowMs };
    } else if (now > store[key].resetTime) {
      store[key] = { count: 1, resetTime: now + windowMs };
    } else {
      store[key].count++;
    }

    if (store[key].count > maxRequests) {
      return res.status(429).json({
        error: 'تم تجاوز حد الطلبات. يرجى المحاولة لاحقاً',
      });
    }

    next();
  };
};
