import bcrypt from "bcryptjs";
import gqlReq, { getAuthenticationHeaders, gql } from "~/utils/gql.server";
import type { UserRole, UserStatus } from "~/utils/user";

export type User = {
  uuid: string;
  fname: string;
  lname: string;
  email: string;
  role: number;
  status: number;
  meta: JSON | null;
};
export type UserWithPassword = User & { passhash: string };

/**
 * Get ALL users.
 * This function works even if the current user doesn't have permission to list all users. Use it accordingly.
 */
export async function getAllUsers() {
  const { users } = await gqlReq<{ users: User[] }>(
    gql`
      query getAllUsers($uuid: uuid) {
        users {
          uuid
          fname
          lname
          email
          role
          status
          meta
        }
      }
    `,
    {},
    getAuthenticationHeaders(null, true)
  );

  return users;
}

/**
 * Get user by UUID.
 * This function works even if the current user doesn't have permission to select users. Use it accordingly.
 */
export async function getUserByUUID(uuid: User["uuid"]) {
  const { users } = await gqlReq<{ users: User[] }>(
    gql`
      query getUserByUUID($uuid: uuid) {
        users(where: { uuid: { _eq: $uuid } }) {
          uuid
          fname
          lname
          email
          role
          status
          meta
        }
      }
    `,
    { uuid },
    getAuthenticationHeaders(null, true)
  );

  if (!users.length) {
    return null;
  }

  return users[0];
}

/**
 * Get user by email.
 * This function works even if the current user doesn't have permission to select users. Use it accordingly.
 */
export async function getUserByEmail(email: User["email"]) {
  const { users } = await gqlReq<{ users: User[] }>(
    gql`
      query getUserByEmail($email: String) {
        users(where: { email: { _eq: $email } }) {
          uuid
          fname
          lname
          email
          role
          status
          meta
        }
      }
    `,
    { email },
    getAuthenticationHeaders(null, true)
  );

  if (!users.length) {
    return null;
  }

  return users[0];
}

/**
 * Create a new user.
 * This function works even if the current user doesn't have permission to create users. Use it accordingly.
 */
export async function createUser(
  email: string,
  role: UserRole,
  status: UserStatus,
  password: string
) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const { insert_users_one: user } = await gqlReq<{ insert_users_one: User }>(
    gql`
      mutation CreateUser($object: users_insert_input!) {
        insert_users_one(object: $object) {
          uuid
          fname
          lname
          email
          role
          status
          meta
        }
      }
    `,
    {
      object: {
        email,
        role,
        status,
        passhash: hashedPassword,
      },
    },
    getAuthenticationHeaders(null, true)
  );

  return user;
}

/**
 * Delete user by email address.
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function deleteUserByEmail(email: User["email"]) {
  return await deleteUser(email);
}

/**
 * Delete user.
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function deleteUser(user: User | User["email"]) {
  const email = typeof user === "string" ? user : user["email"];

  const { delete_users: deletedUsers } = await gqlReq<{ delete_users: User[] }>(
    gql`
      mutation DeleteUser($email: String) {
        insert_users_one(where: { email: { _eq: $email } }) {
          uuid
          fname
          lname
          email
          role
          status
          meta
        }
      }
    `,
    {
      email,
    },
    getAuthenticationHeaders(null, true)
  );

  return deletedUsers[0];
}

/**
 * Verifies login attempt.
 * This function works even if the current user doesn't have permission to select users. Use it accordingly.
 */
export async function verifyLogin(email: User["email"], password: string) {
  const { users } = await gqlReq<{ users: UserWithPassword[] }>(
    gql`
      query Login($email: String, $pw: String) {
        users(
          where: { email: { _eq: $email }, passhash: { _is_null: false } }
        ) {
          uuid
          fname
          lname
          email
          role
          status
          meta
          passhash
        }
      }
    `,
    {
      email,
    },
    getAuthenticationHeaders(null, true)
  );

  if (!users.length) {
    return null;
  }

  const { passhash, ...user } = users[0];
  const isValid = await bcrypt.compare(password, passhash);

  if (!isValid) return null;

  return user;
}
