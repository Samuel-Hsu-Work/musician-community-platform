import { Router } from 'express';
import authRoutes from './auth.routes';
import accountRoutes from './account.routes';
import aiRoutes from './ai.routes';
import cronRoutes from './cron.routes';
import forumRoutes from './forum.routes';
import theoryRoutes from './theory.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Route definitions
router.use('/auth', authRoutes);
router.use('/account', accountRoutes);
router.use('/ai', aiRoutes);
router.use('/cron', cronRoutes);
router.use('/forum', forumRoutes);
router.use('/theory', theoryRoutes);
router.use('/admin', adminRoutes);
// router.use('/users', userRoutes); // Add more routes here as needed

export default router;
