import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// Rate-limit key: per logged-in user when available, otherwise per IP.
// Falls back to IP for anonymous requests (e.g. register, login, anonymous AI usage).
const keyByUserOrIp = (req: Request) => req.user?.userId ?? req.ip ?? 'unknown';

/** Register/login/check-availability — blocks scripted mass account creation. */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

/**
 * AI notation explainer — the most expensive endpoint (live GPT-4o call) and the
 * only one reachable without a login, so it gets the strictest per-identity limit.
 */
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Too many AI requests. Please slow down and try again later.' },
});

/** Create post / create comment — throttles spam posting per account. */
export const createContentRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'You are posting too frequently. Please slow down.' },
});

/** Like/unlike toggles — cheap writes but can be hammered in a tight loop. */
export const likeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyByUserOrIp,
  message: { error: 'Too many requests. Please slow down.' },
});
