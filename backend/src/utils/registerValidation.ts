const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'system',
  'moderator',
  'musictalks',
  'support',
]);

export interface ValidRegisterInput {
  username: string;
  email: string;
  password: string;
}

export function getUsernameValidationError(username: string): string | null {
  const trimmed = username.trim();
  if (!trimmed) {
    return 'Username is required';
  }
  if (!USERNAME_PATTERN.test(trimmed)) {
    return 'Username must be 3–30 characters and contain only letters, numbers, or underscores';
  }
  if (RESERVED_USERNAMES.has(trimmed.toLowerCase())) {
    return 'This username is reserved';
  }
  return null;
}

export function getEmailValidationError(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return 'Email is required';
  }
  if (trimmed.length > 254) {
    return 'Email is too long';
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@example.com)';
  }
  return null;
}

export function getPasswordValidationError(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (password.length > 128) {
    return 'Password is too long (max 128 characters)';
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return 'Password must contain at least one letter and one number';
  }
  return null;
}

export function validateRegisterInput(
  username: string,
  email: string,
  password: string
): ValidRegisterInput {
  const usernameError = getUsernameValidationError(username);
  if (usernameError) {
    throw new Error(usernameError);
  }

  const emailError = getEmailValidationError(email);
  if (emailError) {
    throw new Error(emailError);
  }

  const passwordError = getPasswordValidationError(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  return {
    username: username.trim(),
    email: email.trim().toLowerCase(),
    password,
  };
}

export function normalizeUsername(username: string): string {
  return username.trim();
}

/** Case-insensitive username match for Prisma queries. */
export function usernameEqualsFilter(username: string) {
  return {
    equals: normalizeUsername(username),
    mode: 'insensitive' as const,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
