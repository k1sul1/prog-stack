import type { LoaderFunction } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { getToken, TokenType } from "~/models/token.server";
import { getUserByUUID } from "~/models/user.server";
import { getUser } from "~/utils/session.server";
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
  const token = await getToken(untrustworthyUuid, TokenType.HasuraAuth);

  const tokenMatchesAuthHeader = token?.token === authHeader;
  const tokenIsExpired =
    Date.now() > new Date(token?.token || "1970-01-01").getTime();

  if (!tokenMatchesAuthHeader || !user || tokenIsExpired) {
    let message = "Unauthenticated";

    if (!tokenMatchesAuthHeader) message = "Header token mismatch";
    if (tokenIsExpired) message = "Token is expired";

    return json({ message }, 401);
  } else {
    return json(
      {
        "X-Hasura-Role": UserRole[user.role],
        "X-Hasura-User-Id": user.uuid,
      },
      200
    );
  }
};
