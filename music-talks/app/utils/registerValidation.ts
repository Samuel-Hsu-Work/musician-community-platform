export type RegisterField =
  | "username"
  | "email"
  | "password"
  | "confirmPassword";

export type RegisterFieldErrors = Partial<Record<RegisterField, string>>;

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;
/** local@domain.tld — requires a domain and TLD of at least 2 letters */
const EMAIL_PATTERN =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+$/;
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).+$/;

const RESERVED_USERNAMES = new Set([
  "admin",
  "system",
  "moderator",
  "musictalks",
  "support",
]);

export const REGISTER_HINTS = {
  username: "3–30 characters, letters, numbers, or underscores only",
  email: "Please enter a valid email address (e.g. name@example.com)",
  password: "At least 8 characters, with one letter and one number",
} as const;

function getUsernameFormatError(username: string): string | null {
  if (!USERNAME_PATTERN.test(username)) {
    return REGISTER_HINTS.username;
  }
  if (RESERVED_USERNAMES.has(username.toLowerCase())) {
    return "This username is reserved";
  }
  return null;
}

function getEmailFormatError(email: string): string | null {
  if (email.length > 254) {
    return "Email is too long";
  }
  if (!EMAIL_PATTERN.test(email)) {
    return REGISTER_HINTS.email;
  }
  return null;
}

function getPasswordFormatError(password: string): string | null {
  if (password.length > 128) {
    return "Password is too long (max 128 characters)";
  }
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    !PASSWORD_PATTERN.test(password)
  ) {
    return REGISTER_HINTS.password;
  }
  return null;
}

export function validateRegisterForm(data: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const username = data.username.trim();
  const email = data.email.trim().toLowerCase();
  const password = data.password;
  const confirmPassword = data.confirmPassword;

  if (!username) {
    errors.username = "Username is required";
  } else {
    const formatError = getUsernameFormatError(username);
    if (formatError) errors.username = formatError;
  }

  if (!email) {
    errors.email = "Email is required";
  } else {
    const formatError = getEmailFormatError(email);
    if (formatError) errors.email = formatError;
  }

  if (!password) {
    errors.password = "Password is required";
  } else {
    const formatError = getPasswordFormatError(password);
    if (formatError) errors.password = formatError;
  }

  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
  }

  return errors;
}

/** Blur validation — skip empty fields; show format hints only when user has typed something. */
export function validateRegisterFieldsOnBlur(
  fields: RegisterField[],
  data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};
  const username = data.username.trim();
  const email = data.email.trim().toLowerCase();
  const { password, confirmPassword } = data;

  for (const field of fields) {
    if (field === "username" && username) {
      const formatError = getUsernameFormatError(username);
      if (formatError) errors.username = formatError;
    }

    if (field === "email" && email) {
      const formatError = getEmailFormatError(email);
      if (formatError) errors.email = formatError;
    }

    if (field === "password" && password) {
      const formatError = getPasswordFormatError(password);
      if (formatError) errors.password = formatError;
    }

    if (field === "confirmPassword" && confirmPassword) {
      if (password !== confirmPassword) {
        errors.confirmPassword = "Passwords do not match";
      }
    }
  }

  return errors;
}

/** Validate one or more fields on submit — includes required checks. */
export function validateRegisterFields(
  fields: RegisterField[],
  data: {
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }
): RegisterFieldErrors {
  const allErrors = validateRegisterForm(data);
  const result: RegisterFieldErrors = {};

  for (const field of fields) {
    if (allErrors[field]) {
      result[field] = allErrors[field];
    }
  }

  return result;
}

export function hasRegisterErrors(errors: RegisterFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isRegisterFormValid(data: {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}): boolean {
  return !hasRegisterErrors(validateRegisterForm(data));
}
