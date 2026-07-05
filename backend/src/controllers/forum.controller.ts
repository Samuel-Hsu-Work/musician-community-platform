// Forum Controller
// Handles HTTP requests for forum-related endpoints

import { Request, Response } from 'express';
import forumService from '../services/forum.service';
import { parsePaginationQuery } from '../utils/forumPagination';

function validateCommentText(text: unknown): string | null {
  if (!text || typeof text !== 'string') {
    return 'Comment text is required';
  }
  if (text.trim().length === 0) {
    return 'Comment cannot be empty';
  }
  if (text.length > 1000) {
    return 'Comment is too long (max 1000 characters)';
  }
  return null;
}

export const getLatestTopic = async (req: Request, res: Response) => {
  try {
    const topic = await forumService.getLatestDiscussionTopic();

    if (!topic) {
      return res.status(200).json({
        success: true,
        topic: null,
        message: 'No discussion topics found',
      });
    }

    return res.status(200).json({
      success: true,
      topic,
    });
  } catch (error: any) {
    console.error('Error in getLatestTopic controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch latest discussion topic',
    });
  }
};

export const getTopicById = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const topic = await forumService.getTopicById(topicId, req.user?.userId);

    if (!topic) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    return res.status(200).json({ success: true, topic });
  } catch (error: any) {
    console.error('Error in getTopicById controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch topic',
    });
  }
};

export const getAllTopics = async (req: Request, res: Response) => {
  try {
    const typeParam = req.query.type as string | undefined;

    if (
      !typeParam ||
      !['daily_discussion', 'community_post'].includes(typeParam)
    ) {
      return res.status(400).json({
        error:
          'Query param type is required (daily_discussion or community_post)',
      });
    }

    const { page, limit, search } = parsePaginationQuery(req.query, 20);

    const result = await forumService.getTopicsByType(
      typeParam as 'daily_discussion' | 'community_post',
      req.user?.userId,
      { page, limit, search }
    );

    return res.status(200).json({
      success: true,
      topics: result.topics,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error in getAllTopics controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch topics',
    });
  }
};

export const getComments = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.query;

    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({
        error: 'Topic ID is required',
      });
    }

    const { page, limit } = parsePaginationQuery(req.query, 20);

    const result = await forumService.getCommentsByTopicId(
      topicId,
      req.user?.userId,
      { page, limit }
    );

    return res.status(200).json({
      success: true,
      comments: result.comments,
      pagination: result.pagination,
      totalComments: result.totalComments,
    });
  } catch (error: any) {
    console.error('Error in getComments controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch comments',
    });
  }
};

export const createComment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || !req.user?.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId, text, parentId } = req.body;

    if (!topicId || typeof topicId !== 'string') {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const textError = validateCommentText(text);
    if (textError) {
      return res.status(400).json({ error: textError });
    }

    if (parentId !== undefined && parentId !== null && typeof parentId !== 'string') {
      return res.status(400).json({ error: 'Invalid parent comment ID' });
    }

    const comment = await forumService.createComment(
      topicId,
      req.user.userId,
      req.user.username,
      text,
      parentId ?? undefined
    );

    return res.status(201).json({
      success: true,
      comment,
    });
  } catch (error: any) {
    console.error('Error in createComment controller:', error);

    if (error.message === 'Topic not found') {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (
      error.message === 'Invalid parent comment' ||
      error.message === 'Replies can only be made to top-level comments'
    ) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to create comment',
    });
  }
};

export const updateComment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || !req.user?.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { commentId } = req.params;
    const { text } = req.body;

    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }

    const textError = validateCommentText(text);
    if (textError) {
      return res.status(400).json({ error: textError });
    }

    const comment = await forumService.updateComment(
      commentId,
      req.user.userId,
      req.user.username,
      text
    );

    return res.status(200).json({ success: true, comment });
  } catch (error: any) {
    console.error('Error in updateComment controller:', error);

    if (error.message === 'Comment not found') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to update comment',
    });
  }
};

export const deleteComment = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || !req.user?.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }

    await forumService.deleteComment(
      commentId,
      req.user.userId,
      req.user.username
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteComment controller:', error);

    if (error.message === 'Comment not found') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    return res.status(500).json({
      error: error.message || 'Failed to delete comment',
    });
  }
};

export const createTopic = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId || !req.user?.username) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, content } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Content is too long (max 5000 characters)' });
    }

    const topic = await forumService.createUserTopic(
      req.user.userId,
      req.user.username,
      title,
      content
    );

    return res.status(201).json({
      success: true,
      topic,
    });
  } catch (error: any) {
    console.error('Error in createTopic controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create community post',
    });
  }
};

export const getMyTopics = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { page, limit, search } = parsePaginationQuery(req.query, 20);

    const result = await forumService.getMyTopics(req.user.userId, {
      page,
      limit,
      search,
    });

    return res.status(200).json({
      success: true,
      topics: result.topics,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('Error in getMyTopics controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch your posts',
    });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.params;
    const { title, content } = req.body;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' });
    }

    if (title.length > 200) {
      return res.status(400).json({ error: 'Title is too long (max 200 characters)' });
    }

    if (content.length > 5000) {
      return res.status(400).json({ error: 'Content is too long (max 5000 characters)' });
    }

    const topic = await forumService.updateUserTopic(
      topicId,
      req.user.userId,
      title,
      content
    );

    return res.status(200).json({ success: true, topic });
  } catch (error: any) {
    console.error('Error in updateTopic controller:', error);

    if (error.message === 'Topic not found') {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'You can only edit your own posts' });
    }

    if (error.message === 'Only community posts can be edited') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to update post',
    });
  }
};

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    await forumService.deleteUserTopic(topicId, req.user.userId);

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteTopic controller:', error);

    if (error.message === 'Topic not found') {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (error.message === 'Forbidden') {
      return res.status(403).json({ error: 'You can only delete your own posts' });
    }

    if (error.message === 'Only community posts can be deleted') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to delete post',
    });
  }
};

export const toggleTopicLike = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { topicId } = req.params;

    if (!topicId) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const result = await forumService.toggleTopicLike(topicId, req.user.userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in toggleTopicLike controller:', error);

    if (error.message === 'Topic not found') {
      return res.status(404).json({ error: 'Topic not found' });
    }

    if (error.message === 'Likes are only available on community posts') {
      return res.status(400).json({ error: error.message });
    }

    if (error.message === 'You cannot like your own post') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to toggle like',
    });
  }
};

export const toggleCommentLike = async (req: Request, res: Response) => {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ error: 'Comment ID is required' });
    }

    const result = await forumService.toggleCommentLike(
      commentId,
      req.user.userId,
      req.user.username
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error in toggleCommentLike controller:', error);

    if (error.message === 'Comment not found') {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (error.message === 'You cannot like your own comment') {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({
      error: error.message || 'Failed to toggle like',
    });
  }
};
