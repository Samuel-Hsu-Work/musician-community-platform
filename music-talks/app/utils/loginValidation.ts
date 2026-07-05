import { REGISTER_HINTS } from "./registerValidation";

/** local@domain.tld — requires a domain and TLD of at least 2 letters */
const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

export type LoginField = "username" | "password";

export type LoginFieldErrors = Partial<Record<LoginField, string>>;

export const LOGIN_HINTS = {
  username: REGISTER_HINTS.username,
  email: REGISTER_HINTS.email,
  password: REGISTER_HINTS.password,
} as const;

function getEmailFormatError(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) {
    return "Email is too long";
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return LOGIN_HINTS.email;
  }
  return null;
}

function getUsernameFormatError(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return LOGIN_HINTS.username;
  }
  return null;
}

/** Identity must be a valid username or a valid email. */
export function getLoginIdentityFormatError(identity: string): string | null {
  const trimmed = identity.trim();
  if (!trimmed) return null;

  if (trimmed.includes("@")) {
    return getEmailFormatError(trimmed);
  }
  return getUsernameFormatError(trimmed);
}

export function getLoginIdentityError(identity: string): string | null {
  const trimmed = identity.trim();
  if (!trimmed) {
    return "Username or email is required";
  }
  return getLoginIdentityFormatError(trimmed);
}

function getPasswordFormatError(password: string): string | null {
  if (password.length > 128) {
    return "Password is too long (max 128 characters)";
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_PATTERN.test(password)
  ) {
    return LOGIN_HINTS.password;
  }
  return null;
}

export function getLoginPasswordError(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  return getPasswordFormatError(password);
}

export function validateLoginForm(data: {
  username: string;
  password: string;
}): LoginFieldErrors {
  const errors: LoginFieldErrors = {};
  const identityError = getLoginIdentityError(data.username);
  const passwordError = getLoginPasswordError(data.password);

  if (identityError) errors.username = identityError;
  if (passwordError) errors.password = passwordError;

  return errors;
}

/** Blur validation — skip empty fields; show format hints when input is present. */
export function validateLoginFieldsOnBlur(
  fields: LoginField[],
  data: { username: string; password: string }
): LoginFieldErrors {
  const errors: LoginFieldErrors = {};

  for (const field of fields) {
    if (field === "username") {
      const formatError = getLoginIdentityFormatError(data.username);
      if (formatError) errors.username = formatError;
    }

    if (field === "password" && data.password) {
      const formatError = getPasswordFormatError(data.password);
      if (formatError) errors.password = formatError;
    }
  }

  return errors;
}

export function validateLoginFields(
  fields: LoginField[],
  data: { username: string; password: string }
): LoginFieldErrors {
  const allErrors = validateLoginForm(data);
  const result: LoginFieldErrors = {};

  for (const field of fields) {
    if (allErrors[field]) {
      result[field] = allErrors[field];
    }
  }

  return result;
}

export function hasLoginErrors(errors: LoginFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isLoginFormValid(data: {
  username: string;
  password: string;
}): boolean {
  return !hasLoginErrors(validateLoginForm(data));
}
