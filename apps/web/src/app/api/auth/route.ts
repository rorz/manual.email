/**
 * Landing handler for the bare `/api/auth` path. Better Auth only serves
 * sub-paths (`/api/auth/ok`, `/api/auth/get-session`, `/api/auth/sign-in/*`,
 * the dashboard's `/api/auth/dash/*`, …), so the base segment — which the
 * catch-all `[...all]` route deliberately doesn't match — would otherwise 404
 * and look broken. This returns a 200 so hitting the base URL confirms auth is
 * live and points at the real endpoints.
 */
export const GET = () =>
  Response.json({
    endpoints: ["/api/auth/ok", "/api/auth/get-session"],
    ok: true,
    service: "better-auth",
  });
