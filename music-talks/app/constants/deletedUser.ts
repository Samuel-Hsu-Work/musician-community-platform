/** Must match backend `DELETED_USER_LABEL`. */
export const DELETED_USER_LABEL = "This account no longer exists";

const LEGACY_DELETED_USER_LABEL = "該使用者帳號已不存在";

export function isDeletedUserLabel(name: string | null | undefined): boolean {
  return name === DELETED_USER_LABEL || name === LEGACY_DELETED_USER_LABEL;
}
