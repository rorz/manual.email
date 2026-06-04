import { env } from "cloudflare:workers";
import { outboundMessageSchema } from "@manual.email/contracts";

/**
 * Compose endpoint. Validates a user-composed message at the trust boundary,
 * then hands it to egress via the `EGRESS_QUEUE` producer. The web app never
 * sends mail itself — egress is the single egress point.
 *
 * SECURITY — must not ship publicly as-is: `from` is taken from the client.
 * Once auth exists, derive `from` from the authenticated account's address
 * instead of trusting the request, or this is an open outbound-mail relay.
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }

  const parsed = outboundMessageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false }, { status: 422 });
  }

  await env.EGRESS_QUEUE.send(parsed.data);
  return Response.json({ ok: true });
}
