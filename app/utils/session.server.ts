import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { createToken, Token, TokenType } from "~/models/token.server";

import type { User, UserWithToken } from "~/models/user.server";
import { getUserByUUID } from "~/models/user.server";

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET],
    secure: process.env.NODE_ENV === "production",
  },
});

export const USER_SESSION_KEY = "userId";
export const USER_SESSION_HASURA_TOKEN = "hasuraToken";

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

export async function getUserUUID(
  request: Request
): Promise<User["uuid"] | undefined> {
  const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);

  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserUUID(request);
  if (userId === undefined) return null;

  const user = await getUserByUUID(userId);
  if (user) return user;

  throw await logout(request);
}

export async function requireUserUuid(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const userId = await getUserUUID(request);

  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function requireUser(request: Request, withHasuraToken = true) {
  const userUuid = await requireUserUuid(request);
  const user = await getUserByUUID(userUuid);
  const session = await getSession(request);

  if (user) {
    const hasuraToken = session.has(USER_SESSION_HASURA_TOKEN)
      ? session.get(USER_SESSION_HASURA_TOKEN)
      : null;

    const withToken: UserWithToken = {
      hasuraToken,
      ...user,
    };

    return withToken;
  }

  throw await logout(request);
}

export async function createUserSession({
  request,
  userUuid,
  remember,
  redirectTo,
}: {
  request: Request;
  userUuid: User["uuid"];
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  const { token } = await createToken(userUuid, TokenType.HasuraAuth);

  session.set(USER_SESSION_KEY, userUuid);
  session.set(USER_SESSION_HASURA_TOKEN, token);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        maxAge: remember
          ? 60 * 60 * 24 * 7 // 7 days
          : undefined,
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
