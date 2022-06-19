/**
 * This allows the most basic type of user levels. For more granularity, you should
 * switch to capabilities and do them in the database. Hasura will be your best friend with that.
 */
export enum UserRole {
  Owner = 0,
  Admin = 1,
  User = 2,
}

/**
 * This allows you to prevent users from doing something before they've confirmed their email and so on.
 */
export enum UserStatus {
  Unconfirmed = 0,
  Confirmed = 1,
  Banned = 2,
}

/**
 * Check if user role is at least target role. This allows making pages that both Admins and Owners can see, while preventing Users from seeing them.
 */
export function roleAtLeast(role: UserRole, target: UserRole) {
  return role <= target;
}

/**
 * This is useful for building an user interface where you allow Owners to make other users Owners
 * and prevent Admins from making themselves Owners.
 *
 * Enum enumeration is ironically a bit tricky.
 */
export function getEligibleRolesFromCurrentRole(
  currentRole: UserRole
): Partial<Record<UserRole, number>> {
  return Object.fromEntries(
    Object.entries(UserRole)
      .filter(([k, v]) => !isNaN(Number(k)))
      .filter(([k, v]) => roleAtLeast(currentRole, Number(k) as UserRole))
      .map(([k, v]) => {
        return [v, parseInt(k, 10)];
      })
  );
}
