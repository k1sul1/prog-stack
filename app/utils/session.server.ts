import { createCookieSessionStorage, redirect, Session } from "@remix-run/node";
import {
  createToken,
  DEFAULT_TOKEN_EXPIRY,
  deleteToken,
  getToken,
  Token,
  TokenType,
} from "~/models/token.server";

import type { User, UserWithToken } from "~/models/user.server";
import { getUserByUUID } from "~/models/user.server";
import { currentUrlPathFromRequest } from "~/utils";

/**
 * Generic catch-all error. Used for discriminating.
 */
export class AuthError extends Error {}
/**
 * Can't authenticate something that we don't have a record of.
 */
export class MissingUser extends AuthError {}
/**
 * Expired token? Non recoverable, the session cookie should also be expired, so it's logout time.
 */
export class ExpiredToken extends AuthError {}
/**
 * Missing token is most likely a case of a deleted cookie while a session is active.
 * It might exist in the database.
 */
export class MissingToken extends AuthError {}
/**
 * Token should be refreshed before it expires. Not really an error, but handled by the error handling.
 */
export class ExpiringToken extends AuthError {}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secrets: [process.env.SESSION_SECRET!],
    secure: process.env.NODE_ENV === "production",
  },
});

export const USER_SESSION_KEY = "userId";
export const USER_SESSION_HASURA_TOKEN = "hasuraToken";

/**
 * Utility to force the user to log back in in cases where they still have a session, but the token they have is already expired, or removed from the database.
 */
export async function redirectToLoginAndBackHere(request: Request) {
  const redirectTo = currentUrlPathFromRequest(request);
  const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
  const session = await getSession(request);

  return redirect(`/login?${searchParams}`, {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}

/**
 * authenticate is to be used in loaders and actions.
 *
 * It produces headers, mainly Set-Cookie, that you must ensure are also sent with the loader / action response. It won't send headers by itself.
 *
 * Heavily inspired https://sergiodxa.com/articles/working-with-refresh-tokens-in-remix
 */
export async function authenticate(
  request: Request,
  headers = new Headers()
): Promise<UserWithToken> {
  const session = await getSession(request);
  const userUuid = await getUserUuidFromSession(session);

  if (!userUuid) {
    throw new AuthError("Session lacks user UUID, session is invalid.");
  }

  const user = await getUserByUUID(userUuid);

  try {
    if (!user) {
      throw new MissingUser("No such user, says the database.");
    }

    const sessionToken: Token | null = session.has(USER_SESSION_HASURA_TOKEN)
      ? session.get(USER_SESSION_HASURA_TOKEN)
      : null;
    const d = new Date();
    const ed = new Date(sessionToken?.expires ?? "2000-01-01");
    const msLeft = ed.getTime() - d.getTime();
    const renewAtMs = DEFAULT_TOKEN_EXPIRY / 4; //1000 * 60 * 4;

    // Session token doesn't exist. It may still exist in the database.
    // That happens if the user clears their cookies while logged in, and logs back again.
    if (!sessionToken) {
      throw new MissingToken(
        "No token found in session. Check the database before making any rash decisions."
      );
    }

    if (ed < d) {
      throw new ExpiredToken(
        "That token used to be good, but now it ain't. Come back with a new one."
      );
    }

    // console.log("Token lifetime left", {
    //   minutes: msLeft / 1000 / 60,
    //   renewAt: renewAtMs / 1000 / 60,
    // });

    if (msLeft < renewAtMs) {
      throw new ExpiringToken(
        "This token has been used for a while now. It's time to switch."
      );
    }

    const userWithToken: UserWithToken = {
      hasuraToken: sessionToken,
      ...user,
    };

    return userWithToken;
  } catch (error) {
    return authErrorHandler(error, { headers, user, session });
  }
}

async function authErrorHandler(
  error: unknown,
  {
    headers,
    user,
    session,
  }: { headers: Headers; user: User | null; session: Session }
) {
  const isAuthErr = error instanceof AuthError;
  const isExpiringToken = error instanceof ExpiringToken;
  const isMissingToken = error instanceof MissingToken;
  const isMissingUser = error instanceof MissingUser;

  if (isAuthErr) {
    // Only two cases we want to handle here. Others we can't fix.
    if (isAuthErr && !isExpiringToken && !isMissingToken) {
      throw error;
    }

    // TS doesn't know that MissingUser will throw the error. This tells it.
    if (!user) throw error;

    const hasuraToken = await getToken(user.uuid, TokenType.HasuraAuth);

    if (isMissingToken && !hasuraToken) {
      throw error;
    }

    const token =
      hasuraToken && isMissingToken
        ? hasuraToken
        : await createToken(
            user.uuid,
            TokenType.HasuraAuth,
            DEFAULT_TOKEN_EXPIRY,
            true
          );

    session.set(USER_SESSION_KEY, user.uuid);
    session.set(USER_SESSION_HASURA_TOKEN, token);

    headers.append(
      "Set-Cookie",
      await sessionStorage.commitSession(session, {
        expires: new Date(token.expires),
      })
    );

    const userWithToken: UserWithToken = {
      ...user!,
      hasuraToken: token,
    };

    return userWithToken;
  }

  // Throw everything that's not AuthError
  throw error;
}

export async function getSession(request: Request) {
  const cookie = request.headers.get("Cookie");
  return sessionStorage.getSession(cookie);
}

/**
 * If you need just the user uuid, this is the function to use. Most of the time,
 * you're going to want the full user instead.
 */
export async function getUserUuidFromSession(
  session: Session
): Promise<User["uuid"] | undefined> {
  // const session = await getSession(request);
  const userId = session.get(USER_SESSION_KEY);

  return userId;
}

export async function getCurrentUserFromDb(request: Request) {
  const session = await getSession(request);
  const userId = await getUserUuidFromSession(session);

  if (userId === undefined) return null;

  const user = await getUserByUUID(userId);
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

export async function requireUserUuid(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getSession(request);
  const userId = await getUserUuidFromSession(session);

  if (!userId) {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }

  return userId;
}

export async function createUserSession({
  request,
  userUuid,
  remember, // unused currently, token lifetime will determine the lifetime of the cookie
  redirectTo,
}: {
  request: Request;
  userUuid: User["uuid"];
  remember: boolean;
  redirectTo: string;
}) {
  const session = await getSession(request);
  const token = await createToken(userUuid, TokenType.HasuraAuth);

  session.set(USER_SESSION_KEY, userUuid);
  session.set(USER_SESSION_HASURA_TOKEN, token);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session, {
        expires: new Date(token.expires),
      }),
    },
  });
}

export async function logout(request: Request) {
  const session = await getSession(request);
  const user = await authenticate(request);

  user && (await deleteToken(user.hasuraToken.token));

  return redirect("/", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
