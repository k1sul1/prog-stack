import gqlReq, { getAuthenticationHeaders, gql } from "~/utils/gql.server";
import { User, UserWithToken } from "./user.server";
import crypto from "crypto";

export enum TokenType {
  HasuraAuth,
  PasswordReset,
}

export type Token = {
  token: string;
  type: TokenType;
  expires: Date;
  user: string;
};

export const DAY_IN_MS = 1000 * 60 * 60 * 24;

export async function getToken(
  userUuid: User["uuid"],
  type: TokenType
): Promise<Token | null> {
  const now = Date.now();
  const { tokens } = await gqlReq<{ tokens: Token[] }>(
    gql`
      query getToken($user: uuid, $type: Int) {
        tokens(where: { user: { _eq: $user }, type: { _eq: $type } }) {
          token
          type
          expires
        }
      }
    `,
    { user: userUuid, type },
    await getAuthenticationHeaders(null, true)
  );

  if (!tokens.length) {
    return null;
  }

  const token = tokens[0];

  if (now >= new Date(token.expires).getTime()) {
    // Expired! You should setup a task which peridiocally destroys expired tokens from the db.

    return null;
  }

  return tokens[0];
}

export async function createToken(
  userUuid: User["uuid"],
  type: TokenType,
  expiresMs = DAY_IN_MS
) {
  const existing = await getToken(userUuid, type);

  if (existing) {
    return existing;
  }

  const str = crypto.randomBytes(16).toString("hex");
  const { insert_tokens_one: token } = await gqlReq<{
    insert_tokens_one: Token;
  }>(
    gql`
      mutation CreateToken($object: tokens_insert_input!) {
        insert_tokens_one(object: $object) {
          token
          type
          expires
          user
        }
      }
    `,
    {
      object: {
        token: `Bearer ${str}`,
        type,
        expires: new Date(Date.now() + expiresMs),
        user: userUuid,
      },
    },
    await getAuthenticationHeaders(null, true)
  );

  return token;
}

export async function deleteToken(token: string) {
  const { delete_tokens: deletedTokens } = await gqlReq<{
    delete_tokens: Token;
  }>(
    gql`
      mutation deleteToken($token: String!) {
        delete_tokens_by_pk(token: $token) {
          token
          type
          expires
          user
        }
      }
    `,
    {
      token,
    },
    await getAuthenticationHeaders(null, true)
  );

  return deletedTokens;
}
