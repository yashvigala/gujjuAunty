// Shared helpers for Convex functions. Plain functions in this file are NOT
// exposed as API endpoints — only exported query/mutation/action are.

// Admins are configured by email so no signup flow can self-promote:
//   npx convex env set ADMIN_EMAILS "a@x.com,b@y.com"
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry) => entry.length > 0);
  return admins.includes(email.toLowerCase());
}
