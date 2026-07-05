// Cron Controller
// Handles scheduled/cron job endpoints (called by Python worker)

import { Request, Response } from 'express';
import prisma from '../config/database';
import aiService from '../services/ai.service';
import { env } from '../config/env';
import { getCalendarDateInTimezone, DEFAULT_TIMEZONE } from '../utils/timezone';
import { forumInsightPipelineService } from '../services/forumInsightPipeline.service';
import { parseAiDailyDiscussionResponse } from '../utils/dailyDiscussionTopic';

const DAILY_DISCUSSION_PROMPT = `You are a music theory expert. Generate one engaging daily discussion topic in English.

Output format (strict):
Line 1: Plain title only — max 15 words, no markdown, no "Title:" prefix, no quotes, no numbering.
Line 2: blank
Line 3 onward: Discussion body — 2–4 short paragraphs plus optional guiding questions.

Stay accurate and accessible for learners.`;

/**
 * Generate a topic automatically (called by cron worker)
 * POST /api/cron/generate-topic
 * Headers: x-cron-secret: <CRON_SECRET>
 */
export const generateTopic = async (req: Request, res: Response) => {
  try {
    // Validate cron secret
    const cronSecret = req.headers['x-cron-secret'];

    if (!cronSecret || cronSecret !== env.cronSecret) {
      console.log('❌ Cron request unauthorized');
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    console.log('🕐 Received cron request, starting topic generation...');

    // AI daily topics use UTC calendar day (server-scheduled content)
    const currentDate = getCalendarDateInTimezone(new Date(), DEFAULT_TIMEZONE);

    const existing = await prisma.topic.findFirst({
      where: {
        type: 'daily_discussion',
        date: currentDate,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      console.log('ℹ️ Daily discussion already exists for UTC date:', currentDate);
      return res.status(200).json({
        success: true,
        message: 'Daily discussion already exists for this UTC date',
        data: {
          generated: false,
          skipped: true,
          topic: existing,
        },
      });
    }

    let title: string;
    let content: string;

    if (!env.openaiApiKey) {
      console.warn('⚠️ OpenAI API key not configured, using default topic');
      title = 'Music Theory Learning Journey';
      content =
        'Share your music theory learning methods and experiences. What resources and approaches have been most effective for you?';
    } else {
      try {
        const aiResponse = await aiService.generateResponse(DAILY_DISCUSSION_PROMPT);
        const parsed = parseAiDailyDiscussionResponse(aiResponse);
        title = parsed.title;
        content = parsed.content;
      } catch (error: unknown) {
        console.error('❌ Error generating topic with AI:', error);
        title = 'Music Theory Learning Journey';
        content =
          'Share your music theory learning methods and experiences. What resources and approaches have been most effective for you?';
      }
    }

    const newTopic = await prisma.topic.create({
      data: {
        date: currentDate,
        title,
        content,
        type: 'daily_discussion',
      },
    });

    console.log('✅ Topic generated successfully:', {
      id: newTopic.id,
      title: newTopic.title,
      date: newTopic.date,
    });

    return res.status(200).json({
      success: true,
      message: 'Topic generated successfully',
      data: {
        generated: true,
        skipped: false,
        topic: newTopic,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Cron task failed:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to generate topic';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
};

/**
 * Scan high-like Forum content and populate AI learning table
 * POST /api/cron/process-forum-insights
 * Headers: x-cron-secret: <CRON_SECRET>
 */
export const processForumInsights = async (req: Request, res: Response) => {
  try {
    const cronSecret = req.headers['x-cron-secret'];

    if (!cronSecret || cronSecret !== env.cronSecret) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized',
      });
    }

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
    console.error('Error in processForumInsights:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to process forum insights';
    return res.status(500).json({
      success: false,
      error: message,
    });
  }
};
