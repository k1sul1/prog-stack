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

export const DEFAULT_TOKEN_EXPIRY = 1000 * 60 * 60 * 24; //24h
// export const DEFAULT_TOKEN_EXPIRY = 1000 * 60 * 60 * 0 + 60000 * 5;

/**
 * Get the first matching of type for user UUID.
 *
 * Since user can have multiple valid tokens, you're likely going to want to use getTokens instead.
 *
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function getToken(
  userUuid: User["uuid"],
  type: TokenType
): Promise<Token | null> {
  const now = Date.now();
  const { tokens } = await gqlReq<{
    tokens: Array<Token & { expires: string }>;
  }>(
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

  const result = tokens.find(
    (token) => new Date(token.expires).getTime() > now
  );

  // Destroy any expired tokens
  deleteTokens(
    tokens.filter((token) => new Date(token.expires).getTime() < now)
  );

  return result
    ? {
        ...result,
        expires: new Date(result.expires),
      }
    : null;
}

/**
 * Get all tokens of type for user UUID.
 *
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function getTokens(
  userUuid: User["uuid"],
  type: TokenType
): Promise<Token[] | null> {
  const now = Date.now();
  const { tokens } = await gqlReq<{
    tokens: Array<Token & { expires: string }>;
  }>(
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

  const results = tokens.filter(
    (token) => new Date(token.expires).getTime() > now
  );

  // Destroy any expired tokens
  deleteTokens(
    tokens.filter((token) => new Date(token.expires).getTime() < now)
  );

  return results.map((raw) => {
    const t: Token = {
      ...raw,
      expires: new Date(raw.expires),
    };

    return t;
  });
}

/**
 * Create and attach a token to an user. You can have differnet types of tokens, like PasswordReset and HasuraAuth, just to name two.
 *
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function createToken(
  userUuid: User["uuid"],
  type: TokenType,
  expiresMs = DEFAULT_TOKEN_EXPIRY,
  force = false
): Promise<Token> {
  if (!force) {
    const existing = await getToken(userUuid, type);

    if (existing && new Date() < new Date(existing.expires)) {
      return existing;
    }
  }

  const str = crypto.randomBytes(16).toString("hex");
  const { insert_tokens_one: token } = await gqlReq<{
    insert_tokens_one: Token & { expires: string };
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

  return {
    ...token,
    expires: new Date(token.expires),
  };
}

/**
 * Deletes a token, by the token.
 *
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
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

/**
 * Deletes an array of tokens. Useful for clearing out expired tokens.
 *
 * This function works even if the current user doesn't have permission to delete users. Use it accordingly.
 */
export async function deleteTokens(tokens: Token[]) {
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    await deleteToken(token.token);
  }
}