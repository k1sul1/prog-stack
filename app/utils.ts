/**
 * Generic utils that you're having a hard time finding a category for.
 */

/**
 * Throws an error if condition doesn't evaluate to true, ie. value doesn't exist.
 *
 * @throws Error
 */
export function invariant(condition: any, error: string): void {
  if (condition) return;

  throw new Error(error);
}

export const DEFAULT_REDIRECT = "/";

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
  to: FormDataEntryValue | string | null | undefined,
  defaultRedirect: string = DEFAULT_REDIRECT
) {
  if (!to || typeof to !== "string") {
    return defaultRedirect;
  }

  if (!to.startsWith("/") || to.startsWith("//")) {
    return defaultRedirect;
  }

  return to;
}

/**
 * Wait N milliseconds.
 */
export async function delay(ms: number) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * A very verbose console.log that only prints in the browser, regardless of where you place it.
 *
 * console.trace is used because using a function to breaks the built in trace in the console.
 */
export function log(...args: any): void {
  if (typeof document === "object") {
    console.trace(...args);
  }
}
