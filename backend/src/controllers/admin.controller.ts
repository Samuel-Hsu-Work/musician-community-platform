import { Request, Response } from 'express';
import { env } from '../config/env';
import { forumInsightPipelineService } from '../services/forumInsightPipeline.service';
import { theoryInsightService, THEORY_DOMAIN_LABELS } from '../services/theoryInsight.service';
import { adminForumService } from '../services/adminForum.service';
import { adminUserService } from '../services/adminUser.service';
import { adminTheoryService } from '../services/adminTheory.service';

const VALID_STATUSES = new Set(['draft', 'approved', 'rejected', 'all']);
const VALID_UPDATE_STATUSES = new Set(['approved', 'rejected', 'draft']);

export const getAdminMe = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    user: {
      userId: req.user?.userId,
      username: req.user?.username,
      role: 'admin',
    },
  });
};

export const runForumInsightPipeline = async (_req: Request, res: Response) => {
  try {
    if (!env.openaiApiKey) {
      return res.status(503).json({
        success: false,
        error: 'OPENAI_API_KEY is required for forum insight extraction',
      });
    }

    const result = await forumInsightPipelineService.processHighLikeContent();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error('Error in runForumInsightPipeline:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Pipeline failed',
    });
  }
};

export const listInsights = async (req: Request, res: Response) => {
  try {
    const status =
      typeof req.query.status === 'string' ? req.query.status : 'draft';

    if (!VALID_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'Invalid status. Use draft, approved, rejected, or all',
      });
    }

    const insights = await theoryInsightService.listForAdmin(status);

    return res.status(200).json({
      success: true,
      insights,
    });
  } catch (error: unknown) {
    console.error('Error in listInsights:', error);
    return res.status(500).json({
      error: 'Failed to list insights',
    });
  }
};

export const getLearningTable = async (req: Request, res: Response) => {
  try {
    const [summary, insights] = await Promise.all([
      theoryInsightService.getLearningTableSummary(),
      theoryInsightService.listForAdmin('approved'),
    ]);

    return res.status(200).json({
      success: true,
      summary,
      insights,
    });
  } catch (error: unknown) {
    console.error('Error in getLearningTable:', error);
    return res.status(500).json({
      error: 'Failed to load learning table',
    });
  }
};

export const getLearningTableMatrix = async (req: Request, res: Response) => {
  try {
    const statusParam =
      typeof req.query.status === 'string' ? req.query.status : 'approved';
    const status = statusParam === 'all' ? 'all' : 'approved';
    const domainId =
      typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const withInsightsOnly = req.query.withInsightsOnly === 'true';

    if (domainId && !THEORY_DOMAIN_LABELS[domainId]) {
      return res.status(400).json({ error: 'Invalid domainId' });
    }

    const matrix = await theoryInsightService.getLearningTableMatrix({
      status,
      domainId,
      withInsightsOnly,
    });

    return res.status(200).json({ success: true, matrix });
  } catch (error: unknown) {
    console.error('Error in getLearningTableMatrix:', error);
    return res.status(500).json({
      error: 'Failed to load learning table matrix',
    });
  }
};

export const updateInsightStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id?.trim()) {
      return res.status(400).json({ error: 'Insight ID is required' });
    }

    if (!status || !VALID_UPDATE_STATUSES.has(status)) {
      return res.status(400).json({
        error: 'status must be approved, rejected, or draft',
      });
    }

    const updated = await theoryInsightService.updateStatus(id, status);

    return res.status(200).json({
      success: true,
      insight: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Insight not found') {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error in updateInsightStatus:', error);
    return res.status(500).json({
      error: 'Failed to update insight',
    });
  }
};

export const listForumTopics = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(String(req.query.page ?? '1'), 10);
    const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const type =
      typeof req.query.type === 'string' ? req.query.type : undefined;
    const hidden =
      typeof req.query.hidden === 'string' ? req.query.hidden : undefined;
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await adminForumService.listTopics({
      type,
      hidden,
      search,
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('Error in listForumTopics:', error);
    return res.status(500).json({ error: 'Failed to list forum topics' });
  }
};

export const updateForumTopicVisibility = async (
  req: Request,
  res: Response
) => {
  try {
    const { id } = req.params;
    const { hidden } = req.body;

    if (!id?.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    if (typeof hidden !== 'boolean') {
      return res.status(400).json({ error: 'hidden must be a boolean' });
    }

    const updated = await adminForumService.setTopicHidden(id, hidden);

    return res.status(200).json({ success: true, topic: updated });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Topic not found') {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error in updateForumTopicVisibility:', error);
    return res.status(500).json({ error: 'Failed to update topic visibility' });
  }
};

export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(String(req.query.page ?? '1'), 10);
    const limit = Number.parseInt(String(req.query.limit ?? '20'), 10);
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await adminUserService.listUsers({
      search,
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 20 : limit,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    console.error('Error in listUsers:', error);
    return res.status(500).json({ error: 'Failed to list users' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!id?.trim()) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ error: 'role must be user or admin' });
    }

    const updated = await adminUserService.updateUserRole(
      id,
      role,
      req.user!.userId
    );

    return res.status(200).json({ success: true, user: updated });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'User not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Cannot remove your own admin role') {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Error in updateUserRole:', error);
    return res.status(500).json({ error: 'Failed to update user role' });
  }
};

export const listTheoryTopics = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(String(req.query.page ?? '1'), 10);
    const limit = Number.parseInt(String(req.query.limit ?? '50'), 10);
    const domainId =
      typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const search =
      typeof req.query.search === 'string' ? req.query.search : undefined;

    const result = await adminTheoryService.listTopics({
      domainId,
      search,
      page: Number.isNaN(page) ? 1 : page,
      limit: Number.isNaN(limit) ? 50 : limit,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid domainId') {
      return res.status(400).json({ error: error.message });
    }

    console.error('Error in listTheoryTopics:', error);
    return res.status(500).json({ error: 'Failed to list theory topics' });
  }
};

export const getTheoryTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id?.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const topic = await adminTheoryService.getTopic(id);
    return res.status(200).json({ success: true, topic });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Topic not found') {
      return res.status(404).json({ error: error.message });
    }

    console.error('Error in getTheoryTopic:', error);
    return res.status(500).json({ error: 'Failed to fetch theory topic' });
  }
};

export const updateTheoryTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, category, standardDefinition } = req.body;

    if (!id?.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    const updated = await adminTheoryService.updateTopic(id, {
      name,
      category,
      standardDefinition,
    });

    return res.status(200).json({ success: true, topic: updated });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === 'Topic not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'standardDefinition is required') {
        return res.status(400).json({ error: error.message });
      }
    }

    console.error('Error in updateTheoryTopic:', error);
    return res.status(500).json({ error: 'Failed to update theory topic' });
  }
};
