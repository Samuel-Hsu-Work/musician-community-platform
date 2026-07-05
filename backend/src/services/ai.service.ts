// AI Service
// Contains business logic for AI-powered features using Vercel AI SDK

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { env } from '../config/env';
import type { CategoryGuidance } from './theory.service';
import type { TheoryInsightPromptSlice } from './theoryInsight.service';

// Caps the cost of a single generateText call regardless of caller input.
const EXPLAIN_NOTATION_MAX_OUTPUT_TOKENS = 500;

// Repeat requests for the same notation/lens/topic are common (many users viewing
// the same theory page) and cost-free to serve from cache instead of re-calling the LLM.
const EXPLAIN_NOTATION_CACHE_TTL_MS = 60 * 60 * 1000;
const explainNotationCache = new Map<string, { text: string; expiresAt: number }>();

function getCachedExplanation(key: string): string | undefined {
  const entry = explainNotationCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt < Date.now()) {
    explainNotationCache.delete(key);
    return undefined;
  }
  return entry.text;
}

function setCachedExplanation(key: string, text: string) {
  explainNotationCache.set(key, {
    text,
    expiresAt: Date.now() + EXPLAIN_NOTATION_CACHE_TTL_MS,
  });
}

export class AIService {
  private model;

  constructor() {
    // Initialize OpenAI model using Vercel AI SDK
    // The SDK will use OPENAI_API_KEY from environment variables
    this.model = openai('gpt-4o');
  }

  /**
   * Explain a music notation with AI
   * @param notation - The name of the music notation (e.g., "Treble Clef")
   * @param categoryGuidances - Optional learning-style lenses from DB
   * @returns AI-generated explanation
   */
  async explainNotation(
    notation: string,
    categoryGuidances: CategoryGuidance[] = [],
    communityInsights: TheoryInsightPromptSlice[] = []
  ): Promise<string> {
    const cacheKey = JSON.stringify({
      notation: notation.trim().toLowerCase(),
      categoryIds: categoryGuidances.map((c) => c.id).sort(),
      insightTitles: communityInsights.map((i) => i.title).sort(),
    });

    const cached = getCachedExplanation(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const styleSection =
        categoryGuidances.length > 0
          ? `\n\nAdapt the explanation using this learning-style lens (stay musically accurate):\n${categoryGuidances
              .map(
                (category) =>
                  `- ${category.label}: ${category.aiGuidance}`
              )
              .join('\n')}`
          : '';

      const insightSection =
        communityInsights.length > 0
          ? `\n\nCommunity-learned angles for this topic (use as inspiration; do not copy verbatim; stay accurate):\n${communityInsights
              .map(
                (insight) =>
                  `- [${insight.categoryLabel}] ${insight.title}: ${insight.promptSummary}`
              )
              .join('\n')}`
          : '';

      const prompt = `Write a clear, textbook-style definition of the music theory topic "${notation}".
Write as instructional prose, not as a conversation or Q&A.
Explain what it is, how it appears in written music, and its purpose when reading or performing music.
Be concise but thorough. Respond in English.${styleSection}${insightSection}`;

      const { text } = await generateText({
        model: this.model,
        prompt,
        maxOutputTokens: EXPLAIN_NOTATION_MAX_OUTPUT_TOKENS,
      });

      setCachedExplanation(cacheKey, text);
      return text;
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error('Failed to generate explanation. Please try again.');
    }
  }

  /**
   * Generate a generic AI response (for cron topics, etc.)
   * @param prompt - The user's prompt
   * @returns AI-generated response
   */
  async generateResponse(prompt: string): Promise<string> {
    try {
      const { text } = await generateText({
        model: this.model,
        prompt,
      });

      return text;
    } catch (error) {
      console.error('AI service error:', error);
      throw new Error('Failed to generate response. Please try again.');
    }
  }
}

export default new AIService();
