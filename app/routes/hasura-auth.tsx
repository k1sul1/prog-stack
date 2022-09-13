import type { LoaderFunction } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { deleteToken, getTokens, TokenType } from "~/models/token.server";
import { getUserByUUID } from "~/models/user.server";
import { UserRole } from "~/utils/user";

/**
 * Webhook that Hasura uses to authorize.
 *
 * Error messages are for debugging purposes only, they don't serve a purpose to Hasura.
 */
export const loader: LoaderFunction = async ({ params, request }) => {
  const authHeader = request.headers.get("Authorization");

  // This is user input:
  const untrustworthyUuid = request.headers.get("x-hasura-user-id");

  if (!untrustworthyUuid || !authHeader) {
    const message = "UUID and / or Auth header missing.";

    return json({ message }, 401);
  }

  const user = await getUserByUUID(untrustworthyUuid);
  const tokens = await getTokens(untrustworthyUuid, TokenType.HasuraAuth);

  let tokenMatchesAuthHeader = false;
  let tokenIsExpired = false;

  // There can be multiple tokens attached to an user session.
  // The most common case is when a token is about to expire, a new one is created,
  // while the old one is still perfectly valid. If you stop acceopting the old token at that point,
  // you'll run into race conditions.
  if (tokens) {
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      tokenMatchesAuthHeader = token.token === authHeader;
      tokenIsExpired =
        Date.now() > new Date(token.expires || "1970-01-01").getTime();

      if (tokenMatchesAuthHeader && !tokenIsExpired) break;
    }
  }

  if (!tokenMatchesAuthHeader || !user || tokenIsExpired) {
    let message = "Unauthenticated";

    if (!tokenMatchesAuthHeader)
      message = "Provided authorization header did not match any valid tokens";
    if (tokenIsExpired) message = "Token is expired";

    return json({ message }, 401);
  } else {
    return json(
      {
        // https://hasura.io/docs/latest/auth/authentication/webhook/#webhook-response
        "X-Hasura-Role": UserRole[user.role],
        "X-Hasura-User-Id": user.uuid,
      },
      {
        headers: {},
        status: 200,
      }
    );
  }
};

// rebuild
