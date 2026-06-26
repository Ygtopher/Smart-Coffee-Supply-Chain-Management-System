import { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message: string;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export const createRateLimit = ({ windowMs, maxRequests, message }: RateLimitOptions) => {
  const requests = new Map<string, RateLimitEntry>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = `${req.ip || 'unknown'}:${req.path}`;
    const current = requests.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    entry.count += 1;
    requests.set(key, entry);

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > maxRequests) {
      res.status(429).json({ message });
      return;
    }

    if (requests.size > 10_000) {
      for (const [storedKey, storedEntry] of requests) {
        if (storedEntry.resetAt <= now) requests.delete(storedKey);
      }
    }

    next();
  };
};
