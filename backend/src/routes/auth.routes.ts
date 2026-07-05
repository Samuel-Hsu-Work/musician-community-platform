import { Router } from 'express';
import { register, login, logout, checkRegisterAvailability } from '../controllers/auth.controller';
import { authRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Auth routes
// POST /api/auth/register - Register a new user
router.post('/register', authRateLimiter, register);

// POST /api/auth/check-availability - Username/email format + uniqueness
router.post('/check-availability', authRateLimiter, checkRegisterAvailability);

// POST /api/auth/login - Login an existing user
router.post('/login', authRateLimiter, login);

// POST /api/auth/logout - Logout (client-side token removal)
router.post('/logout', logout);

export default router;
