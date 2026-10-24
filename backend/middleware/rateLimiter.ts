import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export function createInMemoryRateLimiter(options: { windowMs: number; max: number; message: string }) {
  const hits = new Map<string, RateLimitRecord>();

  // Cleanup old keys periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 60000).unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const clientKey = `${Array.isArray(ip) ? ip[0] : ip}`;
    const now = Date.now();

    const record = hits.get(clientKey);

    if (!record || now > record.resetTime) {
      hits.set(clientKey, { count: 1, resetTime: now + options.windowMs });
      return next();
    }

    if (record.count >= options.max) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({ 
        error: options.message,
        retryAfter: retryAfterSec 
      });
    }

    record.count += 1;
    next();
  };
}

// 5 requests per 10 minutes per IP for sending Aadhaar OTP
export const aadhaarOtpRateLimiter = createInMemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests. Please wait before requesting another OTP.'
});

// 10 submissions per 10 minutes per IP for verifying Aadhaar OTP
export const aadhaarVerifyRateLimiter = createInMemoryRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: 'Too many OTP verification attempts. Please wait a few minutes.'
});

// 10 bank checks per 15 minutes per IP
export const bankVerifyRateLimiter = createInMemoryRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many bank verification requests. Please wait a few minutes.'
});
