import type { LoaderFunction } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { getToken, TokenType } from "~/models/token.server";
import { getUserByUUID } from "~/models/user.server";
import { getUser } from "~/utils/session.server";
import { UserRole } from "~/utils/user";

export const loader: LoaderFunction = async ({ params, request }) => {
  const authHeader = request.headers.get("Authorization");
  const untrustworthyUuid =
    request.headers.get("x-hasura-user-id") || // NOTE: Literally anyone can POST to your GraphQL
    // endpoint, supplying this header containing an admins uuid, and so on. Should **probably**
    // pass an encrypted version of the uuid instead and decrypt it here.
    null;

  if (!untrustworthyUuid || !authHeader) {
    console.log("PERKELE", untrustworthyUuid, authHeader);
    return json(
      {
        message: "No UUID or Authorization header provided.",
      },
      401
    );
  }

  const user = await getUserByUUID(untrustworthyUuid);
  const token = await getToken(
    untrustworthyUuid,
    TokenType.HasuraAuth,
    undefined,
    false // No point in generating a token if it doesn't exist, it can't be the same as in authHeader if we do
  );

  if (token?.token === authHeader || !user) {
    return json(
      {
        message: "User is unauthenticated",
      },
      401
    );
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
