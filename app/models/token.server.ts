import gqlReq, { getAuthenticationHeaders, gql } from "~/utils/gql.server";
import LRUCache from "lru-cache";
import { User } from "./user.server";
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

export const TokenCache = new LRUCache({
  max: 500,
});

const getKey = (uuid: User["uuid"], type: TokenType) => `${uuid}-${type}`;

export async function getToken(
  userUuid: User["uuid"],
  type: TokenType,
  expiresMs = DAY_IN_MS,
  generate = true
): Promise<Token | null> {
  const cached = TokenCache.get<Token>(getKey(userUuid, type));

  if (cached) {
    return cached;
  }

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

  if (!tokens.length && !generate) {
    return null;
  }

  let token = tokens[0]
    ? tokens[0]
    : await createToken(userUuid, type, expiresMs);
  let expDate = new Date(token.expires).getTime();
  let ttl = expDate - now;

  if (expDate >= now) {
    token = await createToken(userUuid, type, expiresMs);
    expDate = new Date(token.expires).getTime();
    ttl = expDate - now;
  }

  TokenCache.set(getKey(userUuid, type), token, { ttl });

  return token;
}

export async function createToken(
  userUuid: User["uuid"],
  type: TokenType,
  expiresMs = DAY_IN_MS
) {
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
  const ttl = new Date(token.expires).getTime() - Date.now();

  TokenCache.set(getKey(userUuid, type), token, { ttl });
  return token;
}
