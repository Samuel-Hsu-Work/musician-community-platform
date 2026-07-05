import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getAccount,
  updateUsername,
  updatePreferences,
  updateLearningStyle,
  deleteAccount,
} from '../controllers/account.controller';

const router = Router();

router.get('/me', authenticate, getAccount);
router.patch('/username', authenticate, updateUsername);
router.patch('/preferences', authenticate, updatePreferences);
router.patch('/learning-style', authenticate, updateLearningStyle);
router.delete('/', authenticate, deleteAccount);

export default router;
