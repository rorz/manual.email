/**
 * Filtering orchestration — the step the ingress queue consumer runs for each
 * resolved message, between recipient resolution and delivery.
 *
 * Flow: skip if already filtered (cheap retry) → load the account's program →
 * read the raw body from R2 and extract bodies → run the program in the Sandbox →
 * interpret the output (mode-aware fail policy) → deliver the message row and
 * record the verdict together.
 *
 * Ordering matters: a message only becomes visible once it has a verdict, and
 * an infrastructure failure (missing body, Sandbox/Gemini error) throws before
 * delivery so the queue retries rather than delivering an unfiltered message.
 */

import type { IngressMessage } from "@manual.email/contracts";
import type { Db } from "@manual.email/db";
import { deliver } from "../delivery";
import { extractBodies } from "./body";
import { runFilter } from "./executor";
import { hasVerdict, loadFilterConfig, recordVerdict } from "./store";
import { interpretOutput } from "./verdict";

export const filterMessage = async (
  env: Env,
  db: Db,
  accountId: string,
  body: IngressMessage,
): Promise<void> => {
  if (await hasVerdict(db, body.id)) {
    await deliver(db, accountId, body);
    return;
  }

  const program = await loadFilterConfig(db, accountId);

  const object = await env.MESSAGES_BUCKET.get(body.r2Key);
  if (!object) throw new Error(`ingress: body missing for ${body.id}`);
  const bodies = await extractBodies(await object.arrayBuffer());

  const raw = await runFilter(
    env.Sandbox,
    accountId,
    program,
    { sender: body.from, subject: body.subject, ...bodies },
    env.GEMINI_FLASH_LITE,
  );
  const verdict = interpretOutput(program.mode, raw);

  await deliver(db, accountId, body);
  await recordVerdict(db, accountId, body.id, verdict);
};
