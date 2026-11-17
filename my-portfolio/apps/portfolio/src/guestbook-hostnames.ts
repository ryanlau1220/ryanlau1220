/** A Turnstile token is valid only for the allowed hostname serving this request. */
export function isVerifiedGuestbookHostname(
  configuredHostnames: string | undefined,
  requestUrl: string,
  verifiedHostname: string | undefined,
): boolean {
  if (!configuredHostnames || !verifiedHostname) return false;

  const allowed = configuredHostnames
    .split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);
  const requestHostname = new URL(requestUrl).hostname.toLowerCase();
  const tokenHostname = verifiedHostname.toLowerCase();
  return allowed.includes(requestHostname) && tokenHostname === requestHostname;
}
