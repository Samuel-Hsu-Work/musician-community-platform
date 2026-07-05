// AI Controller
// Handles HTTP requests for AI-related endpoints

import { Request, Response } from 'express';
import aiService from '../services/ai.service';
import { theoryService } from '../services/theory.service';
import { theoryInsightService } from '../services/theoryInsight.service';

const VALID_CATEGORY_IDS = new Set([
  'music-core',
  'art',
  'everyday-life',
  'performance',
]);

function normalizeCategoryIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (id): id is string =>
      typeof id === 'string' && VALID_CATEGORY_IDS.has(id)
  );
}

/**
 * Explain a music theory topic using AI
 * POST /api/ai/explain-notation
 * Body: { notation: string, theoryTopicId?: string, categoryIds?: string[] }
 */
export const explainNotation = async (req: Request, res: Response) => {
  try {
    const { notation, theoryTopicId } = req.body;

    if (!notation || typeof notation !== 'string') {
      return res.status(400).json({
        error: 'Notation is required and must be a string',
      });
    }

    let categoryIds: string[] = [];
    let categoryGuidances;

    if (req.user?.userId) {
      categoryIds = await theoryService.getLearningStyleCategoryIds(
        req.user.userId
      );
      categoryGuidances = await theoryService.getCategoryGuidancesForUser(
        req.user.userId
      );
    } else {
      categoryIds = normalizeCategoryIds(req.body.categoryIds);
      categoryGuidances =
        await theoryService.getCategoryGuidancesByIds(categoryIds);
    }

    const topicId =
      typeof theoryTopicId === 'string' && theoryTopicId.trim()
        ? theoryTopicId.trim()
        : null;

    const communityInsights = topicId
      ? await theoryInsightService.getPromptSlicesForTopic(
          topicId,
          categoryIds.length > 0 ? categoryIds : undefined
        )
      : [];

    const explanation = await aiService.explainNotation(
      notation,
      categoryGuidances,
      communityInsights
    );

    return res.status(200).json({
      success: true,
      explanation,
      personalized:
        categoryGuidances.length > 0 || communityInsights.length > 0,
      categoryIds: categoryGuidances.map((category) => category.id),
      communityInsightCount: communityInsights.length,
    });
  } catch (error: any) {
    console.error('Error in explainNotation controller:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate explanation',
    });
  }
};
