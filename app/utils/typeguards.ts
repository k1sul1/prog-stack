import type { User } from "~/models/user.server";

export function isUser(user: any): user is User {
  return user && typeof user === "object" && typeof user.email === "string";
}
