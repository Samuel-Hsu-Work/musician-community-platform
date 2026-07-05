import { Router } from 'express';
import {
  getNotationDefinition,
  getTopicInsights,
  listExplanationCategories,
} from '../controllers/theory.controller';

const router = Router();

router.get('/explanation-categories', listExplanationCategories);
router.get('/topics/:topicId/insights', getTopicInsights);
router.get('/notations/:notationId', getNotationDefinition);

export default router;
