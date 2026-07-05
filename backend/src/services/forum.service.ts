// Forum Service
// Contains business logic for forum-related operations

import prisma from '../config/database';
import { getCalendarDateInTimezone, resolveTimezone } from '../utils/timezone';
import {
  DEFAULT_COMMENT_PAGE_SIZE,
  DEFAULT_TOPIC_PAGE_SIZE,
  buildPaginationMeta,
  type PaginationMeta,
} from '../utils/forumPagination';

export type TopicType = 'daily_discussion' | 'community_post';

type TopicRow = {
  id: string;
  date: string;
  title: string;
  content: string;
  type: string;
  userId: string | null;
  authorUsername: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { likes: number };
};

type CommentRow = {
  id: string;
  topicId: string;
  userId: string | null;
  username: string;
  text: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: { likes: number };
  replies?: CommentRow[];
};

type TopicRowWithHidden = TopicRow & { hidden?: boolean };

function formatTopicWithLikes(topic: TopicRowWithHidden, likedByUser = false) {
  return {
    id: topic.id,
    date: topic.date,
    title: topic.title,
    content: topic.content,
    type: topic.type,
    hidden: topic.hidden ?? false,
    userId: topic.userId,
    authorUsername: topic.authorUsername,
    createdAt: topic.createdAt,
    updatedAt: topic.updatedAt,
    likeCount: topic._count?.likes ?? 0,
    likedByUser,
  };
}

type FormattedComment = {
  id: string;
  topicId: string;
  userId: string | null;
  username: string;
  text: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  likeCount: number;
  likedByUser: boolean;
  replies: FormattedComment[];
};

function formatComment(
  comment: CommentRow,
  likedByUser = false,
  replies: FormattedComment[] = []
): FormattedComment {
  return {
    id: comment.id,
    topicId: comment.topicId,
    userId: comment.userId,
    username: comment.username,
    text: comment.text,
    parentId: comment.parentId,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    likeCount: comment._count?.likes ?? 0,
    likedByUser,
    replies,
  };
}

function isOwnCommentRecord(
  comment: { userId: string | null; username: string },
  userId: string,
  username: string
) {
  return (
    comment.userId === userId ||
    (!comment.userId &&
      comment.username.toLowerCase() === username.toLowerCase())
  );
}

function buildTopicSearchFilter(search?: string) {
  if (!search) return undefined;
  return {
    OR: [
      { title: { contains: search, mode: 'insensitive' as const } },
      { content: { contains: search, mode: 'insensitive' as const } },
    ],
  };
}

async function getLikedTopicIds(userId: string, topicIds: string[]) {
  if (topicIds.length === 0) return new Set<string>();
  const likes = await prisma.topicLike.findMany({
    where: { userId, topicId: { in: topicIds } },
    select: { topicId: true },
  });
  return new Set(likes.map((l) => l.topicId));
}

async function getLikedCommentIds(userId: string, commentIds: string[]) {
  if (commentIds.length === 0) return new Set<string>();
  const likes = await prisma.commentLike.findMany({
    where: { userId, commentId: { in: commentIds } },
    select: { commentId: true },
  });
  return new Set(likes.map((l) => l.commentId));
}

export class ForumService {
  /** Latest AI-generated daily discussion topic */
  async getLatestDiscussionTopic() {
    return prisma.topic.findFirst({
      where: { type: 'daily_discussion' },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Single topic by id (permalink / deep link) */
  async getTopicById(topicId: string, userId?: string) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
      include: { _count: { select: { likes: true } } },
    });

    if (!topic || topic.hidden) return null;

    let likedByUser = false;
    if (userId && topic.type === 'community_post') {
      const like = await prisma.topicLike.findUnique({
        where: { topicId_userId: { topicId, userId } },
      });
      likedByUser = !!like;
    }

    return formatTopicWithLikes(topic, likedByUser);
  }

  /** Get topics filtered by type with pagination and search */
  async getTopicsByType(
    type: TopicType,
    userId?: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_TOPIC_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const searchFilter = buildTopicSearchFilter(options.search);

    const where = {
      type,
      hidden: false,
      ...(searchFilter ?? {}),
    };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: { _count: { select: { likes: true } } },
      }),
      prisma.topic.count({ where }),
    ]);

    let likedTopicIds = new Set<string>();
    if (userId && type === 'community_post') {
      likedTopicIds = await getLikedTopicIds(
        userId,
        topics.map((t) => t.id)
      );
    }

    return {
      topics: topics.map((topic) =>
        formatTopicWithLikes(topic, likedTopicIds.has(topic.id))
      ),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async getCommentsByTopicId(
    topicId: string,
    userId?: string,
    options: { page?: number; limit?: number } = {}
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_COMMENT_PAGE_SIZE;
    const skip = (page - 1) * limit;

    const topLevelWhere = { topicId, parentId: null };

    const [topLevel, totalTopLevel, replyCount] = await Promise.all([
      prisma.comment.findMany({
        where: topLevelWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { likes: true } } },
      }),
      prisma.comment.count({ where: topLevelWhere }),
      prisma.comment.count({ where: { topicId, parentId: { not: null } } }),
    ]);

    const topLevelIds = topLevel.map((c) => c.id);
    const replies =
      topLevelIds.length > 0
        ? await prisma.comment.findMany({
            where: { topicId, parentId: { in: topLevelIds } },
            orderBy: { createdAt: 'asc' },
            include: { _count: { select: { likes: true } } },
          })
        : [];

    const allIds = [...topLevel.map((c) => c.id), ...replies.map((c) => c.id)];
    const likedCommentIds = userId
      ? await getLikedCommentIds(userId, allIds)
      : new Set<string>();

    const repliesByParent = new Map<string, CommentRow[]>();
    for (const reply of replies) {
      const list = repliesByParent.get(reply.parentId!) ?? [];
      list.push(reply);
      repliesByParent.set(reply.parentId!, list);
    }

    const comments = topLevel.map((comment) =>
      formatComment(
        comment,
        likedCommentIds.has(comment.id),
        (repliesByParent.get(comment.id) ?? []).map((reply) =>
          formatComment(reply, likedCommentIds.has(reply.id))
        )
      )
    );

    return {
      comments,
      pagination: buildPaginationMeta(page, limit, totalTopLevel),
      totalComments: totalTopLevel + replyCount,
    };
  }

  async createComment(
    topicId: string,
    userId: string,
    username: string,
    text: string,
    parentId?: string
  ) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('Topic not found');
    }

    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parent || parent.topicId !== topicId) {
        throw new Error('Invalid parent comment');
      }

      if (parent.parentId !== null) {
        throw new Error('Replies can only be made to top-level comments');
      }
    }

    const comment = await prisma.comment.create({
      data: {
        topicId,
        userId,
        username: username.trim(),
        text: text.trim(),
        parentId: parentId ?? null,
      },
      include: { _count: { select: { likes: true } } },
    });

    return formatComment(comment, false);
  }

  async updateComment(
    commentId: string,
    userId: string,
    username: string,
    text: string
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (!isOwnCommentRecord(comment, userId, username)) {
      throw new Error('Forbidden');
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: {
        text: text.trim(),
        userId: comment.userId ?? userId,
      },
      include: { _count: { select: { likes: true } } },
    });

    const likedByUser = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    return formatComment(updated, !!likedByUser);
  }

  async deleteComment(commentId: string, userId: string, username: string) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (!isOwnCommentRecord(comment, userId, username)) {
      throw new Error('Forbidden');
    }

    await prisma.comment.delete({ where: { id: commentId } });
  }

  async createUserTopic(
    userId: string,
    authorUsername: string,
    title: string,
    content: string
  ) {
    const prefs = await prisma.userPreferences.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    const currentDate = getCalendarDateInTimezone(
      new Date(),
      resolveTimezone(prefs?.timezone)
    );

    const topic = await prisma.topic.create({
      data: {
        date: currentDate,
        title: title.trim(),
        content: content.trim(),
        type: 'community_post',
        userId,
        authorUsername: authorUsername.trim(),
      },
      include: { _count: { select: { likes: true } } },
    });

    return formatTopicWithLikes(topic, false);
  }

  async getMyTopics(
    userId: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ) {
    const page = options.page ?? 1;
    const limit = options.limit ?? DEFAULT_TOPIC_PAGE_SIZE;
    const skip = (page - 1) * limit;
    const searchFilter = buildTopicSearchFilter(options.search);

    const where = {
      userId,
      type: 'community_post' as const,
      ...(searchFilter ?? {}),
    };

    const [topics, total] = await Promise.all([
      prisma.topic.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { likes: true } } },
      }),
      prisma.topic.count({ where }),
    ]);

    return {
      topics: topics.map((topic) => formatTopicWithLikes(topic, false)),
      pagination: buildPaginationMeta(page, limit, total),
    };
  }

  async updateUserTopic(
    topicId: string,
    userId: string,
    title: string,
    content: string
  ) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('Topic not found');
    }

    if (topic.userId !== userId) {
      throw new Error('Forbidden');
    }

    if (topic.type !== 'community_post') {
      throw new Error('Only community posts can be edited');
    }

    const updated = await prisma.topic.update({
      where: { id: topicId },
      data: {
        title: title.trim(),
        content: content.trim(),
      },
      include: { _count: { select: { likes: true } } },
    });

    return formatTopicWithLikes(updated, false);
  }

  async deleteUserTopic(topicId: string, userId: string) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('Topic not found');
    }

    if (topic.userId !== userId) {
      throw new Error('Forbidden');
    }

    if (topic.type !== 'community_post') {
      throw new Error('Only community posts can be deleted');
    }

    await prisma.topic.delete({ where: { id: topicId } });
  }

  async toggleTopicLike(topicId: string, userId: string) {
    const topic = await prisma.topic.findUnique({
      where: { id: topicId },
    });

    if (!topic) {
      throw new Error('Topic not found');
    }

    if (topic.type !== 'community_post') {
      throw new Error('Likes are only available on community posts');
    }

    if (topic.userId === userId) {
      throw new Error('You cannot like your own post');
    }

    const existing = await prisma.topicLike.findUnique({
      where: { topicId_userId: { topicId, userId } },
    });

    if (existing) {
      await prisma.topicLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.topicLike.create({
        data: { topicId, userId },
      });
    }

    const likeCount = await prisma.topicLike.count({ where: { topicId } });
    const likedByUser = !existing;

    return { likeCount, likedByUser };
  }

  async toggleCommentLike(
    commentId: string,
    userId: string,
    username?: string
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (username && isOwnCommentRecord(comment, userId, username)) {
      throw new Error('You cannot like your own comment');
    }

    if (!username && comment.userId === userId) {
      throw new Error('You cannot like your own comment');
    }

    const existing = await prisma.commentLike.findUnique({
      where: { commentId_userId: { commentId, userId } },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
    } else {
      await prisma.commentLike.create({
        data: { commentId, userId },
      });
    }

    const likeCount = await prisma.commentLike.count({ where: { commentId } });
    const likedByUser = !existing;

    return { likeCount, likedByUser };
  }
}

export default new ForumService();
