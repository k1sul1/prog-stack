import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getUser, logout } from "~/utils/session.server";

export const action: ActionFunction = async ({ request }) => {
  return logout(request);
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

  // This allows logging out by navigating to /logout in the browser.
  // This also means that you should NOT have links to /logout, as the browser may prefetch them and log out the user.
  if (!user) {
    return redirect("/");
  }

  return logout(request);
};
