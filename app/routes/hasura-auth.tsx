import type { LoaderFunction } from "@remix-run/server-runtime";
import { json } from "@remix-run/server-runtime";
import { getUserByUUID } from "~/models/user.server";
import { getUser } from "~/utils/session.server";
import { UserRole } from "~/utils/user";

export const loader: LoaderFunction = async ({ params, request }) => {
  // sessionUser is NOT present when Hasura calls this webhook. It's here only so you can visit the endpoint and see what Hasura sees.
  const sessionUser = await getUser(request);
  const userUuid =
    sessionUser?.uuid || request.headers.get("x-hasura-user-id") || null;

  if (!userUuid) {
    // Use this if you want to allow unauthenticated users to do something.
    // You can define row level permissions in hasura console.

    // return json(
    //   {
    //     "X-Hasura-Role": "visitor",
    //     "X-Hasura-User-Id": "0",
    //   },
    //   200
    // );

    return json(
      {
        message: "User is unauthenticated",
      },
      401
    );
  } else {
    const user = await getUserByUUID(userUuid);

    if (!user) {
      return json(
        {
          message: "User does not exist",
        },
        401
      );
    }

    return json(
      {
        "X-Hasura-Role": UserRole[user.role],
        "X-Hasura-User-Id": user.uuid,
      },
      200
    );
  }
};
