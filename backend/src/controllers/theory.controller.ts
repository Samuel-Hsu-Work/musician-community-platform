import { Request, Response } from 'express';
import { theoryService } from '../services/theory.service';
import { theoryInsightService } from '../services/theoryInsight.service';

const VALID_INSIGHT_CATEGORIES = new Set([
  'music-core',
  'art',
  'everyday-life',
  'performance',
]);

export const getNotationDefinition = async (req: Request, res: Response) => {
  try {
    const { notationId } = req.params;

    if (!notationId?.trim()) {
      return res.status(400).json({ error: 'Notation ID is required' });
    }

    const definition = await theoryService.getNotationDefinition(notationId);

    if (!definition) {
      return res.status(404).json({ error: 'Notation definition not found' });
    }

    return res.status(200).json({
      success: true,
      definition: {
        id: definition.id,
        name: definition.name,
        category: definition.category,
        standardDefinition: definition.standardDefinition,
      },
    });
  } catch (error: unknown) {
    console.error('Error in getNotationDefinition:', error);
    return res.status(500).json({
      error: 'Failed to fetch notation definition',
    });
  }
};

export const listExplanationCategories = async (
  _req: Request,
  res: Response
) => {
  try {
    const categories = await theoryService.listExplanationCategories();
    return res.status(200).json({ success: true, categories });
  } catch (error: unknown) {
    console.error('Error in listExplanationCategories:', error);
    return res.status(500).json({
      error: 'Failed to fetch explanation categories',
    });
  }
};

export const getTopicInsights = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const categoryId =
      typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;

    if (!topicId?.trim()) {
      return res.status(400).json({ error: 'Topic ID is required' });
    }

    if (categoryId && !VALID_INSIGHT_CATEGORIES.has(categoryId)) {
      return res.status(400).json({ error: 'Invalid categoryId' });
    }

    const insights = await theoryInsightService.getApprovedForTopic(
      topicId,
      categoryId ? [categoryId] : undefined
    );

    return res.status(200).json({
      success: true,
      insights: insights.map((insight) => ({
        id: insight.id,
        theoryTopicId: insight.theoryTopicId,
        categoryId: insight.categoryId,
        categoryLabel: insight.categoryLabel,
        title: insight.title,
        content: insight.content,
        sourceType: insight.sourceType,
        sourceLikeCount: insight.sourceLikeCount,
      })),
    });
  } catch (error: unknown) {
    console.error('Error in getTopicInsights:', error);
    return res.status(500).json({
      error: 'Failed to fetch topic insights',
    });
  }
};
