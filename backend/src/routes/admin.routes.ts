import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import * as adminController from '../controllers/admin.controller';

const router = Router();

router.use(authenticate, requireAdmin);

router.get('/me', adminController.getAdminMe);

router.post('/forum-insights/run', adminController.runForumInsightPipeline);
router.get('/insights', adminController.listInsights);
router.get('/insights/learning-table', adminController.getLearningTable);
router.get(
  '/insights/learning-table/matrix',
  adminController.getLearningTableMatrix
);
router.patch('/insights/:id', adminController.updateInsightStatus);

router.get('/forum/topics', adminController.listForumTopics);
router.patch('/forum/topics/:id', adminController.updateForumTopicVisibility);

router.get('/users', adminController.listUsers);
router.patch('/users/:id', adminController.updateUserRole);

router.get('/theory/topics', adminController.listTheoryTopics);
router.get('/theory/topics/:id', adminController.getTheoryTopic);
router.patch('/theory/topics/:id', adminController.updateTheoryTopic);

export default router;
