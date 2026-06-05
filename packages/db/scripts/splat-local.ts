import { execFileSync } from "node:child_process";

if (process.argv.length > 2) {
  console.error(
    "usage: bun run db:splat:local\nThis splat is local-only and accepts no flags.",
  );
  process.exit(1);
}

const command = `
PRAGMA foreign_keys = OFF;
DELETE FROM session;
DELETE FROM account;
DELETE FROM verification;
DELETE FROM user;
DELETE FROM invite_codes;
DELETE FROM message_tags;
DELETE FROM message_verdicts;
DELETE FROM messages;
DELETE FROM processed_messages;
DELETE FROM dead_letters;
DELETE FROM filter_configs;
DELETE FROM tray_tags;
DELETE FROM trays;
DELETE FROM tags;
DELETE FROM addresses;
DELETE FROM accounts;
PRAGMA foreign_keys = ON;
`;

execFileSync(
  "wrangler",
  [
    "d1",
    "execute",
    "manual-email",
    "--local",
    "--persist-to",
    "../../.wrangler/state",
    "--command",
    command,
  ],
  { cwd: new URL("..", import.meta.url).pathname, stdio: "inherit" },
);

console.log("Splatted local D1 data.");

execFileSync("bun", ["scripts/seed-local-signup-code.ts"], {
  cwd: new URL("..", import.meta.url).pathname,
  stdio: "inherit",
});
