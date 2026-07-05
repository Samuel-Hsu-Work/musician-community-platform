/** Reject when edit distance to an existing username is at most this value (1 = one edit away). */
export const USERNAME_TOO_SIMILAR_MAX_DISTANCE = 1;

export const USERNAME_TOO_SIMILAR_ERROR =
  'Please choose a more distinct username';

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );

  for (let i = 0; i < rows; i++) matrix[i][0] = i;
  for (let j = 0; j < cols; j++) matrix[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

export function areUsernamesTooSimilar(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return false;
  return (
    levenshteinDistance(left, right) <= USERNAME_TOO_SIMILAR_MAX_DISTANCE
  );
}

export function findSimilarUsername(
  username: string,
  existingUsernames: string[]
): string | null {
  const normalized = username.trim();
  for (const existing of existingUsernames) {
    if (areUsernamesTooSimilar(normalized, existing)) {
      return existing;
    }
  }
  return null;
}
