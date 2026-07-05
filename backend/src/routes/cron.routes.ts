// Cron Routes
// Defines API routes for cron/scheduled job endpoints

import { Router } from 'express';
import * as cronController from '../controllers/cron.controller';

const router = Router();

// POST /api/cron/generate-topic - Generate a topic (called by Python worker)
router.post('/generate-topic', cronController.generateTopic);
router.post('/process-forum-insights', cronController.processForumInsights);

export default router;
