// Forum Routes
// Defines API routes for forum-related endpoints

import { Router } from 'express';
import * as forumController from '../controllers/forum.controller';
import {
  authenticate,
  optionalAuthenticate,
} from '../middleware/auth.middleware';
import {
  createContentRateLimiter,
  likeRateLimiter,
} from '../middleware/rateLimit.middleware';

const router = Router();

// GET /api/forum/topic/latest - Latest AI discussion topic
router.get('/topic/latest', forumController.getLatestTopic);

// GET /api/forum/topics?type=daily_discussion|community_post
router.get('/topics/mine', authenticate, forumController.getMyTopics);
router.get('/topics', optionalAuthenticate, forumController.getAllTopics);

// GET /api/forum/topics/:topicId - Single topic (permalink)
router.get('/topics/:topicId', optionalAuthenticate, forumController.getTopicById);

// POST /api/forum/topics - Create community post (auth required)
router.post(
  '/topics',
  authenticate,
  createContentRateLimiter,
  forumController.createTopic
);

router.patch('/topics/:topicId', authenticate, forumController.updateTopic);
router.delete('/topics/:topicId', authenticate, forumController.deleteTopic);

// POST /api/forum/topics/:topicId/like - Toggle like on community post
router.post(
  '/topics/:topicId/like',
  authenticate,
  likeRateLimiter,
  forumController.toggleTopicLike
);

router.get('/comments', optionalAuthenticate, forumController.getComments);
router.post(
  '/comments',
  authenticate,
  createContentRateLimiter,
  forumController.createComment
);
router.patch('/comments/:commentId', authenticate, forumController.updateComment);
router.delete('/comments/:commentId', authenticate, forumController.deleteComment);
router.post(
  '/comments/:commentId/like',
  authenticate,
  likeRateLimiter,
  forumController.toggleCommentLike
);

export default router;
