import prisma from '../config/database';

export interface CategoryGuidance {
  id: string;
  label: string;
  aiGuidance: string;
}

export class TheoryService {
  async getNotationDefinition(notationId: string) {
    return prisma.notationDefinition.findUnique({
      where: { id: notationId },
    });
  }

  async listExplanationCategories() {
    return prisma.explanationCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        label: true,
        shortLabel: true,
        icon: true,
        description: true,
        sortOrder: true,
      },
    });
  }

  async getLearningStyleCategoryIds(userId: string): Promise<string[]> {
    const rows = await prisma.userLearningCategory.findMany({
      where: { userId },
      select: { categoryId: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => row.categoryId);
  }

  async getCategoryGuidancesForUser(
    userId: string
  ): Promise<CategoryGuidance[]> {
    const categoryIds = await this.getLearningStyleCategoryIds(userId);
    return this.getCategoryGuidancesByIds(categoryIds);
  }

  async getCategoryGuidancesByIds(
    categoryIds: string[]
  ): Promise<CategoryGuidance[]> {
    if (categoryIds.length === 0) {
      return [];
    }

    const categories = await prisma.explanationCategory.findMany({
      where: { id: { in: categoryIds } },
      select: {
        id: true,
        label: true,
        aiGuidance: true,
        sortOrder: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((category) => ({
      id: category.id,
      label: category.label,
      aiGuidance: category.aiGuidance,
    }));
  }

  async setLearningStyleCategoryIds(
    userId: string,
    categoryIds: string[]
  ): Promise<string[]> {
    const uniqueIds = [...new Set(categoryIds)].slice(0, 1);

    if (uniqueIds.length > 0) {
      const existing = await prisma.explanationCategory.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      });

      const existingIds = new Set(existing.map((row) => row.id));
      const invalid = uniqueIds.filter((id) => !existingIds.has(id));
      if (invalid.length > 0) {
        throw new Error(`Unknown learning style categories: ${invalid.join(', ')}`);
      }
    }

    await prisma.$transaction([
      prisma.userLearningCategory.deleteMany({ where: { userId } }),
      ...(uniqueIds.length > 0
        ? [
            prisma.userLearningCategory.createMany({
              data: uniqueIds.map((categoryId) => ({ userId, categoryId })),
            }),
          ]
        : []),
    ]);

    return uniqueIds;
  }
}

export const theoryService = new TheoryService();
