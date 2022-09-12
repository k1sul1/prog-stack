import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

import { getUser, logout } from "~/utils/session.server";

export async function action({ request }: ActionArgs) {
  return logout(request);
}

export async function loader({ request }: LoaderArgs) {
  const user = await getUser(request);

  // This allows logging out by navigating to /logout in the browser.
  // This also means that you should NOT have links to /logout, as the browser may prefetch them and log out the user.
  if (!user) {
    return redirect("/");
  }

  return logout(request);
};
