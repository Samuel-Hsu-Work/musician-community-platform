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
      { username: { contains: term, mode: 'insensitive' as const } },
      { email: { contains: term, mode: 'insensitive' as const } },
    ],
  };
}

export class AdminUserService {
  async listUsers(options: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_TOPIC_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const searchFilter = buildSearchFilter(options.search);

    const where = searchFilter ?? {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              topics: true,
              comments: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        topicCount: user._count.topics,
        commentCount: user._count.comments,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async updateUserRole(
    targetUserId: string,
    role: 'user' | 'admin',
    actingUserId: string
  ) {
    if (targetUserId === actingUserId && role !== 'admin') {
      throw new Error('Cannot remove your own admin role');
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const updated = await prisma.user.update({
      where: { id: targetUserId },
      data: { role },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    return updated;
  }
}

export const adminUserService = new AdminUserService();
