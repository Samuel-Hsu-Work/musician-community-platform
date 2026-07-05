import { Router } from 'express';
import { optionalAuthenticate } from '../middleware/auth.middleware';
import { aiRateLimiter } from '../middleware/rateLimit.middleware';
import * as aiController from '../controllers/ai.controller';

const router = Router();

// POST /api/ai/explain-notation - Explain a music notation
router.post(
  '/explain-notation',
  optionalAuthenticate,
  aiRateLimiter,
  aiController.explainNotation
);

export default router;
