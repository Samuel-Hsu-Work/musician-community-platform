import prisma from '../config/database';
import {
  DEFAULT_TOPIC_PAGE_SIZE,
  buildPaginationMeta,
} from '../utils/forumPagination';

function buildSearchFilter(search?: string) {
  if (!search?.trim()) return undefined;
  const term = search.trim();
  return {
    OR: [
      { title: { contains: term, mode: 'insensitive' as const } },
      { content: { contains: term, mode: 'insensitive' as const } },
      { authorUsername: { contains: term, mode: 'insensitive' as const } },
    ],
  };
}

export class AdminForumService {
  async listTopics(options: {
    type?: string;
    hidden?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_TOPIC_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const searchFilter = buildSearchFilter(options.search);

    const where = {
      ...(options.type ? { type: options.type } : {}),
      ...(options.hidden === 'true'
        ? { hidden: true }
        : options.hidden === 'false'
          ? { hidden: false }
          : {}),
      ...(searchFilter ?? {}),
    };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }],
        skip,
        take: limit,
        include: { _count: { select: { likes: true, comments: true } } },
      }),
      prisma.topic.count({ where }),
    ]);

    return {
      topics: topics.map((topic) => ({
        id: topic.id,
        date: topic.date,
        title: topic.title,
        content: topic.content,
        type: topic.type,
        hidden: topic.hidden,
        userId: topic.userId,
        authorUsername: topic.authorUsername,
        likeCount: topic._count.likes,
        commentCount: topic._count.comments,
        createdAt: topic.createdAt,
        updatedAt: topic.updatedAt,
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async setTopicHidden(topicId: string, hidden: boolean) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      select: { id: true },
    });

    if (!topic) {
      throw new Error('Topic not found');
    }

    return prisma.topic.update({
      where: { id: topicId },
      data: { hidden },
      select: {
        id: true,
        hidden: true,
        updatedAt: true,
      },
    });
  }
}

export const adminForumService = new AdminForumService();
