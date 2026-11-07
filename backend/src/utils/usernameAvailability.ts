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

/**
 * Blocks a released username from being claimed for USERNAME_HOLD_DAYS, so nobody can
 * impersonate the previous owner. Pass `releasedByUserId` when the owner renamed
 * away from it (they may switch back); omit it when the account was deleted.
 */
export async function holdUsername(
  username: string,
  tx?: PrismaTx,
  releasedByUserId?: string
): Promise<void> {
  const client = tx ?? prisma;
  const usernameLower = normalizeUsername(username).toLowerCase();
  const heldUntil = getUsernameHoldUntil();
  const releasedBy = releasedByUserId ?? null;

  await client.usernameHold.upsert({
    where: { usernameLower },
    create: { usernameLower, heldUntil, releasedByUserId: releasedBy },
    update: { heldUntil, releasedByUserId: releasedBy },
  });
}

/** Holds that block `claimantUserId` (a user is never blocked by a name they released). */
function activeHoldsBlocking(claimantUserId?: string) {
  return {
    heldUntil: { gt: new Date() },
    ...(claimantUserId
      ? { OR: [{ releasedByUserId: null }, { NOT: { releasedByUserId: claimantUserId } }] }
      : {}),
  };
}

export async function assertUsernameNotHeld(
  username: string,
  claimantUserId?: string
): Promise<void> {
  const usernameLower = normalizeUsername(username).toLowerCase();
  const hold = await prisma.usernameHold.findFirst({
    where: { usernameLower, ...activeHoldsBlocking(claimantUserId) },
  });

  if (hold) {
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
      where: activeHoldsBlocking(excludeUserId),
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
  await assertUsernameNotHeld(username, excludeUserId);
  await assertUsernameNotTooSimilar(username, excludeUserId);
}
