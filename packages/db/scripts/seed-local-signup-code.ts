import { execFileSync } from "node:child_process";
import { hashPassword } from "better-auth/crypto";
import { normalizeInviteCode } from "../src/invites";

const JOIN_PHRASE = "let me in";
const LOCAL_USER = {
  email: "rory@manual.email",
  id: "user_local_rory",
  name: "rory",
  password: "manual",
};

const code = normalizeInviteCode(JOIN_PHRASE);

if (process.argv.length > 2) {
  console.error(
    "usage: bun run db:seed:local\nThis seed is local-only and accepts no flags.",
  );
  process.exit(1);
}

if (!code) {
  throw new Error(`Invalid local join phrase: ${JOIN_PHRASE}`);
}

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;
const passwordHash = await hashPassword(LOCAL_USER.password);
const accountId = `account_${LOCAL_USER.id}_credential`;
const command = `
INSERT INTO invite_codes (code)
VALUES (${quote(code)})
ON CONFLICT(code) DO UPDATE SET
  expires_at = NULL,
  reserved_at = NULL,
  used_at = NULL,
  used_by_user_id = NULL;

INSERT INTO user (id, name, email, email_verified, image, created_at, updated_at)
VALUES (
  ${quote(LOCAL_USER.id)},
  ${quote(LOCAL_USER.name)},
  ${quote(LOCAL_USER.email)},
  1,
  NULL,
  unixepoch(),
  unixepoch()
)
ON CONFLICT(email) DO UPDATE SET
  id = excluded.id,
  name = excluded.name,
  email_verified = excluded.email_verified,
  image = excluded.image,
  updated_at = unixepoch();

DELETE FROM session WHERE user_id = ${quote(LOCAL_USER.id)};

INSERT INTO account (
  id,
  account_id,
  provider_id,
  user_id,
  password,
  created_at,
  updated_at
)
VALUES (
  ${quote(accountId)},
  ${quote(LOCAL_USER.id)},
  'credential',
  ${quote(LOCAL_USER.id)},
  ${quote(passwordHash)},
  unixepoch(),
  unixepoch()
)
ON CONFLICT(id) DO UPDATE SET
  account_id = excluded.account_id,
  provider_id = excluded.provider_id,
  user_id = excluded.user_id,
  password = excluded.password,
  updated_at = unixepoch();
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

console.log(`Seeded local signup code: "${JOIN_PHRASE}" (${code})`);
console.log(`Seeded local user: ${LOCAL_USER.name} / ${LOCAL_USER.password}`);
