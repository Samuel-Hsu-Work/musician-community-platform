// Authentication service
// Contains business logic for authentication (password hashing, user creation, token generation)

import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import prisma from '../config/database';
import { env } from '../config/env';
import {
  validateRegisterInput,
  getUsernameValidationError,
  getEmailValidationError,
  normalizeUsername,
  normalizeEmail,
  usernameEqualsFilter,
} from '../utils/registerValidation';
import { validateLoginInput } from '../utils/loginValidation';
import {
  holdUsername,
  assertUsernameAvailable,
  USERNAME_TOO_SIMILAR_ERROR,
  USERNAME_HELD_ERROR,
} from '../utils/usernameAvailability';
import { resolveTimezone } from '../utils/timezone';

export class AuthService {
  // Register a new user
  async register(
    username: string,
    email: string,
    password: string,
    timezone?: string
  ) {
    const { username: validUsername, email: validEmail, password: validPassword } =
      validateRegisterInput(username, email, password);

    const emailTaken = await prisma.user.findUnique({
      where: { email: validEmail },
    });
    if (emailTaken) {
      throw new Error('This email is already registered');
    }

    const usernameTaken = await prisma.user.findFirst({
      where: { username: usernameEqualsFilter(validUsername) },
    });
    if (usernameTaken) {
      throw new Error('This username is already taken');
    }

    await assertUsernameAvailable(validUsername);

    // Hash the password (never store plain text passwords!)
    const hashedPassword = await bcrypt.hash(validPassword, 10);
    const displayTimezone = resolveTimezone(timezone);

    // Step 3: Create user with profile and preferences
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: validUsername,
          email: validEmail,
          password: hashedPassword,
          preferences: {
            create: { timezone: displayTimezone },
          },
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      return newUser;
    });

    // Step 4: Create JWT token
    if (!env.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' } as SignOptions
    );

    return {
      user,
      token,
    };
  }

  /** Check username/email availability (format + uniqueness). Used on register blur. */
  async checkRegisterAvailability(username?: string, email?: string) {
    const result: {
      username?: { available: boolean; error?: string };
      email?: { available: boolean; error?: string };
    } = {};

    if (username !== undefined) {
      const formatError = getUsernameValidationError(username);
      if (formatError) {
        result.username = { available: false, error: formatError };
      } else {
        const normalized = normalizeUsername(username);
        const taken = await prisma.user.findFirst({
          where: { username: usernameEqualsFilter(normalized) },
        });
        if (taken) {
          result.username = {
            available: false,
            error: 'This username is already taken',
          };
        } else {
          try {
            await assertUsernameAvailable(normalized);
            result.username = { available: true };
          } catch (error: unknown) {
            if (
              error instanceof Error &&
              (error.message === USERNAME_TOO_SIMILAR_ERROR ||
                error.message === USERNAME_HELD_ERROR)
            ) {
              result.username = { available: false, error: error.message };
            } else {
              throw error;
            }
          }
        }
      }
    }

    if (email !== undefined) {
      const formatError = getEmailValidationError(email);
      if (formatError) {
        result.email = { available: false, error: formatError };
      } else {
        const normalized = normalizeEmail(email);
        const taken = await prisma.user.findUnique({
          where: { email: normalized },
        });
        result.email = taken
          ? { available: false, error: 'This email is already registered' }
          : { available: true };
      }
    }

    return result;
  }

  // Login an existing user
  async login(username: string, password: string) {
    const { username: identity, password: validPassword } = validateLoginInput(
      username,
      password
    );

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: usernameEqualsFilter(identity) },
          { email: identity.toLowerCase() },
        ],
      },
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Step 2: Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(validPassword, user.password);

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Step 3: Create JWT token
    if (!env.jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn || '7d' } as SignOptions
    );

    // Step 4: Return user (without password) and token
    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    };
  }
}

// Export a singleton instance
export const authService = new AuthService();
