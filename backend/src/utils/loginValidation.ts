import {
  getEmailValidationError,
  getUsernameValidationError,
  getPasswordValidationError,
} from './registerValidation';

export type LoginField = 'username' | 'password';

export type LoginFieldErrors = Partial<Record<LoginField, string>>;

export function getLoginIdentityError(identity: string): string | null {
  const trimmed = identity.trim();
  if (!trimmed) {
    return 'Username or email is required';
  }
  if (trimmed.includes('@')) {
    const emailError = getEmailValidationError(trimmed);
    if (emailError && emailError !== 'Email is required') {
      return emailError;
    }
    return null;
  }

  const usernameError = getUsernameValidationError(trimmed);
  if (usernameError && usernameError !== 'Username is required') {
    return usernameError;
  }
  return null;
}

export function getLoginPasswordError(password: string): string | null {
  if (!password) {
    return 'Password is required';
  }
  return getPasswordValidationError(password);
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

export function validateLoginInput(username: string, password: string) {
  const identityError = getLoginIdentityError(username);
  if (identityError) {
    throw new Error(identityError);
  }

  const passwordError = getLoginPasswordError(password);
  if (passwordError) {
    throw new Error(passwordError);
  }

  return {
    username: username.trim(),
    password,
  };
}
