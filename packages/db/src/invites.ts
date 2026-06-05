import { and, eq, gt, isNull, lt, or } from "drizzle-orm";
import type { Db } from "./client";
import { inviteCodes } from "./schema";

const WORDS =
  "amber anchor apple atlas basin beam berry birch bloom breeze bridge brook candle canyon cedar charm city clear cloud coast copper coral cotton creek dawn delta dune echo ember fern field flame forest frost garden gentle harbor hazel hill honey iris island ivory juniper lagoon lantern leaf linen maple meadow mint moon noble ocean olive orchard paper pearl pine pixel plain porch quartz quiet rain raven river rose sage signal silver sky slate solar spice stone storm sugar summer tide timber velvet violet willow winter";

const WORD_BANK = WORDS.split(" ");
const INVITE_CODE_PARTS = /^[a-z]+$/;
const RESERVATION_TTL_MS = 10 * 60 * 1000;

const randomUint32 = () => {
  const api = (
    globalThis as {
      crypto?: {
        getRandomValues?: (array: Uint32Array) => Uint32Array;
      };
    }
  ).crypto;
  const random = new Uint32Array(1);
  if (api?.getRandomValues) {
    api.getRandomValues(random);
    return random[0] ?? 0;
  }
  return Math.floor(Math.random() * 2 ** 32);
};

const pickWord = () => {
  return WORD_BANK[randomUint32() % WORD_BANK.length] ?? "amber";
};

export const generateInviteCode = (): string =>
  [pickWord(), pickWord(), pickWord()].join(".");

export const normalizeInviteCode = (raw: string): string | null => {
  const parts = raw
    .trim()
    .toLowerCase()
    .split(/[\s._-]+/)
    .filter(Boolean);
  if (
    parts.length !== 3 ||
    parts.some((part) => !INVITE_CODE_PARTS.test(part))
  ) {
    return null;
  }
  return parts.join(".");
};

export const createInviteCode = async (
  db: Db,
  options: { expiresAt?: number | null } = {},
): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateInviteCode();
    const inserted = await db
      .insert(inviteCodes)
      .values({ code, expiresAt: options.expiresAt ?? null })
      .onConflictDoNothing()
      .returning({ code: inviteCodes.code });
    if (inserted[0]) return inserted[0].code;
  }

  throw new Error("Could not generate a unique invite code.");
};

export const reserveInviteCode = async (
  db: Db,
  code: string,
): Promise<boolean> => {
  const now = Date.now();
  const staleBefore = now - RESERVATION_TTL_MS;

  const reserved = await db
    .update(inviteCodes)
    .set({ reservedAt: now })
    .where(
      and(
        eq(inviteCodes.code, code),
        isNull(inviteCodes.usedAt),
        or(isNull(inviteCodes.expiresAt), gt(inviteCodes.expiresAt, now)),
        or(
          isNull(inviteCodes.reservedAt),
          lt(inviteCodes.reservedAt, staleBefore),
        ),
      ),
    )
    .returning({ code: inviteCodes.code });

  return reserved.length > 0;
};

export const releaseInviteCode = async (
  db: Db,
  code: string,
): Promise<void> => {
  await db
    .update(inviteCodes)
    .set({ reservedAt: null })
    .where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedAt)));
};

export const redeemInviteCode = async (
  db: Db,
  code: string,
  userId: string,
): Promise<void> => {
  await db
    .update(inviteCodes)
    .set({ reservedAt: null, usedAt: Date.now(), usedByUserId: userId })
    .where(and(eq(inviteCodes.code, code), isNull(inviteCodes.usedAt)));
};
