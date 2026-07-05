import prisma from '../config/database';
import { normalizeUsername } from './registerValidation';
import {
  findSimilarUsername,
  USERNAME_TOO_SIMILAR_ERROR,
} from './usernameSimilarity';

const RESERVED_USERNAMES = [
  'admin',
  'system',
  'moderator',
  'musictalks',
  'support',
];

export const USERNAME_HOLD_DAYS = 30;

export const USERNAME_HELD_ERROR = 'This username is not available';

export { USERNAME_TOO_SIMILAR_ERROR };

type PrismaTx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export function getUsernameHoldUntil(from = new Date()): Date {
  const heldUntil = new Date(from);
  heldUntil.setDate(heldUntil.getDate() + USERNAME_HOLD_DAYS);
  return heldUntil;
}

export async function holdUsername(
  username: string,
  tx?: PrismaTx
): Promise<void> {
  const client = tx ?? prisma;
  const usernameLower = normalizeUsername(username).toLowerCase();
  const heldUntil = getUsernameHoldUntil();

  await client.usernameHold.upsert({
    where: { usernameLower },
    create: { usernameLower, heldUntil },
    update: { heldUntil },
  });
}

export async function assertUsernameNotHeld(username: string): Promise<void> {
  const usernameLower = normalizeUsername(username).toLowerCase();
  const hold = await prisma.usernameHold.findUnique({
    where: { usernameLower },
  });

  if (hold && hold.heldUntil > new Date()) {
    throw new Error(USERNAME_HELD_ERROR);
  }
}

export async function assertUsernameNotTooSimilar(
  username: string,
  excludeUserId?: string
): Promise<void> {
  const normalized = normalizeUsername(username);

  const [users, activeHolds] = await Promise.all([
    prisma.user.findMany({
      where: excludeUserId ? { NOT: { id: excludeUserId } } : undefined,
      select: { username: true },
    }),
    prisma.usernameHold.findMany({
      where: { heldUntil: { gt: new Date() } },
      select: { usernameLower: true },
    }),
  ]);

  const existingNames = [
    ...users.map((user) => user.username),
    ...activeHolds.map((hold) => hold.usernameLower),
    ...RESERVED_USERNAMES,
  ];

  const conflict = findSimilarUsername(normalized, existingNames);
  if (conflict) {
    throw new Error(USERNAME_TOO_SIMILAR_ERROR);
  }
}

export async function assertUsernameAvailable(
  username: string,
  excludeUserId?: string
): Promise<void> {
  await assertUsernameNotHeld(username);
  await assertUsernameNotTooSimilar(username, excludeUserId);
}
