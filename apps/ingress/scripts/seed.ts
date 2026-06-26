/**
 * Seed / register an account and its address(es) in D1 so inbound mail resolves
 * to a mailbox. A stop-gap registration path until the web app owns sign-up;
 * addresses are canonicalised with the same `parseAddress` used by resolution,
 * so what's stored always matches what inbound lookup queries.
 *
 * Local D1 by default; pass `--remote` to target the deployed database:
 *   bun run --filter @manual.email/ingress seed -- --name "Rory" hello@manual.email
 */

import { execFileSync } from "node:child_process";
import { parseAddress } from "@manual.email/db";

const argv = process.argv.slice(2);
let displayName: string | null = null;
let remote = false;
const inputs: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--remote") remote = true;
  else if (arg === "--name") displayName = argv[++i] ?? null;
  else if (arg !== undefined) inputs.push(arg);
}

const canonical = [...new Set(inputs.map((a) => parseAddress(a)?.canonical))];
if (canonical.length === 0 || canonical.includes(undefined)) {
  console.error(
    "usage: seed [--name <display>] [--remote] <address> [address...]",
  );
  process.exit(1);
}

const accountId = `acct_${crypto.randomUUID()}`;
const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const name = displayName ? quote(displayName) : "NULL";
const statements = [
  `INSERT INTO accounts (id, display_name, created_at) VALUES (${quote(accountId)}, ${name}, unixepoch() * 1000);`,
  ...canonical.map(
    (address, index) =>
      `INSERT INTO addresses (address, account_id, is_primary, created_at) VALUES (${quote(address as string)}, ${quote(accountId)}, ${index === 0 ? 1 : 0}, unixepoch() * 1000);`,
  ),
];

execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    "manual-email",
    remote ? "--remote" : "--local",
    // Local state is shared across Workers at the repo root so a seeded mailbox
    // is visible to ingress delivery and the web app's inbox alike.
    ...(remote ? [] : ["--persist-to", "../../.wrangler/state"]),
    "--command",
    statements.join(" "),
  ],
  { cwd: new URL("..", import.meta.url).pathname, stdio: "inherit" },
);

console.log(`Seeded ${accountId} -> ${canonical.join(", ")}`);
