import type { ClientError, Variables, RequestDocument } from "graphql-request";
import { GraphQLClient, gql } from "graphql-request";
import type { User } from "~/models/user.server";
import { UserRole } from "./user";
export { gql };

export const client = new GraphQLClient(process.env.HASURA_URL);

/**
 * Helper for adding authentication to your GraphQL calls. This way we get row level permissions
 * that change depending on user role.
 *
 * Sometimes you have a situation where you don't have an user to make the call with, that's why you have
 * the sudo param as an escape hatch.
 */
export function getAuthenticationHeaders(
  user: User | null,
  sudo = false
): Record<string, string> {
  let headers: ReturnType<typeof getAuthenticationHeaders> = {};

  if (user) {
    headers["x-hasura-user-id"] = user.uuid;
  }

  // Using the admin secret prevents Hasura from calling the webhook unnecessarily.
  if (sudo || (user && user.role === UserRole.admin)) {
    headers["x-hasura-admin-secret"] = process.env.HASURA_ADMIN_SECRET;
  }

  return headers;
}

export default async function gqlReq<T = RequestDocument, Y = Variables>(
  query: string,
  variables: Y,
  optHeaders: Record<string, string> = {}
) {
  try {
    const response = await client.request<T, Y>(query, variables, optHeaders);

    return response;
  } catch (e) {
    const clientError = e as ClientError;

    if (clientError.response?.status === 404) {
      console.error(clientError);
      throw new Error("Tried to request an endpoint that does not exist");
    }

    throw clientError;
  }
}
