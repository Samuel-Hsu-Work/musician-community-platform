import prisma from '../config/database';
import { resolveTimezone } from '../utils/timezone';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { DELETED_USER_LABEL } from '../constants/deletedUser';
import { holdUsername } from '../utils/usernameAvailability';
import { usernameEqualsFilter } from '../utils/registerValidation';
import {
  assertUsernameAvailable,
} from '../utils/usernameAvailability';
import { theoryService } from './theory.service';

const userSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

const preferencesSelect = {
  id: true,
  language: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
} as const;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const RESERVED_USERNAMES = new Set([
  'admin',
  'system',
  'moderator',
  'musictalks',
  'support',
]);

function validateUsername(username: string): string {
  const trimmed = username.trim();
  if (!trimmed) {
    throw new Error('Username is required');
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    throw new Error(
      'Username must be 3–30 characters and contain only letters, numbers, or underscores'
    );
  }
  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
    throw new Error('This username is reserved');
  }
  return trimmed;
}

async function ensurePreferences(userId: string) {
  return prisma.userPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: preferencesSelect,
  });
}

function signToken(userId: string, username: string, role: string) {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.sign(
    { userId, username, role },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn || '7d' } as SignOptions
  );
}

export class AccountService {
  async getAccount(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });

    if (!user) {
      throw new Error('User not found');
    }

    const preferences = await ensurePreferences(userId);
    const learningStyleCategoryIds =
      await theoryService.getLearningStyleCategoryIds(userId);

    return {
      user,
      preferences,
      learningStyleCategoryIds,
    };
  }

  async updateLearningStyle(userId: string, categoryIds: string[]) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const learningStyleCategoryIds =
      await theoryService.setLearningStyleCategoryIds(userId, categoryIds);

    return { learningStyleCategoryIds };
  }

  async updateUsername(userId: string, username: string) {
    const newUsername = validateUsername(username);

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!currentUser) {
      throw new Error('User not found');
    }

    if (currentUser.username === newUsername) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: userSelect,
      });
      return {
        user: user!,
        token: signToken(userId, newUsername, user!.role),
      };
    }

    const taken = await prisma.user.findFirst({
      where: {
        username: usernameEqualsFilter(newUsername),
        NOT: { id: userId },
      },
    });

    if (taken) {
      throw new Error('Username is already taken');
    }

    await assertUsernameAvailable(newUsername, userId);

    const oldUsername = currentUser.username;

    const user = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { username: newUsername },
        select: userSelect,
      });

      await tx.topic.updateMany({
        where: { userId },
        data: { authorUsername: newUsername },
      });

      await tx.comment.updateMany({
        where: { userId },
        data: { username: newUsername },
      });

      // Legacy comments created before userId was stored
      await tx.comment.updateMany({
        where: {
          userId: null,
          username: oldUsername,
        },
        data: { username: newUsername },
      });

      return updatedUser;
    });

    return {
      user,
      token: signToken(userId, newUsername, user.role),
    };
  }

  async updatePreferences(
    userId: string,
    data: {
      language?: string;
      timezone?: string;
    }
  ) {
    await ensurePreferences(userId);

    const updateData: {
      language?: string;
      timezone?: string;
    } = {};

    if (data.language !== undefined) updateData.language = data.language;
    if (data.timezone !== undefined) {
      updateData.timezone = resolveTimezone(data.timezone);
    }

    return prisma.userPreferences.update({
      where: { userId },
      data: updateData,
      select: preferencesSelect,
    });
  }

  /**
   * Permanently delete account (PII removed).
   * Community posts and comments are kept with a tombstone author label.
   */
  async deleteAccount(userId: string, password: string) {
    if (!password) {
      throw new Error('Password is required to delete your account');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, password: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Incorrect password');
    }

    const oldUsername = user.username;

    await prisma.$transaction(async (tx) => {
      await tx.topic.updateMany({
        where: { userId, type: 'community_post' },
        data: {
          userId: null,
          authorUsername: DELETED_USER_LABEL,
        },
      });

      await tx.comment.updateMany({
        where: { userId },
        data: {
          userId: null,
          username: DELETED_USER_LABEL,
        },
      });

      await tx.comment.updateMany({
        where: {
          userId: null,
          username: { equals: oldUsername, mode: 'insensitive' },
        },
        data: { username: DELETED_USER_LABEL },
      });

      await holdUsername(oldUsername, tx);

      await tx.user.delete({ where: { id: userId } });
    });
  }
}

export const accountService = new AccountService();
