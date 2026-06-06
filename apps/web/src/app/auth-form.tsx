"use client";

import { Button, cn, Input } from "@manual.email/ui";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type ClipboardEvent,
  type Dispatch,
  type KeyboardEvent,
  type SetStateAction,
  useActionState,
  useId,
  useRef,
  useState,
} from "react";
import { type AuthState, authenticate } from "./actions";

type AuthMode = "sign-in" | "invite-code";
type InviteParts = [string, string, string];

interface AuthFormProps {
  cardClassName?: string;
  controlClassName?: string;
  errorClassName?: string;
  linkClassName?: string;
  submitClassName?: string;
  titleClassName?: string;
}

interface InviteCodeInputProps {
  parts: InviteParts;
  setParts: Dispatch<SetStateAction<InviteParts>>;
}

const invitePartCount = 3;

const blankInviteParts = (): InviteParts => ["", "", ""];

const normalizeInviteWord = (value: string) =>
  value.toLowerCase().replace(/[^a-z]/g, "");

const splitInviteWords = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(/[\s._-]+/)
    .map(normalizeInviteWord)
    .filter(Boolean)
    .slice(0, invitePartCount);

const fillInviteParts = (
  parts: InviteParts,
  startIndex: number,
  words: string[],
): InviteParts => {
  const next = [...parts] as InviteParts;
  words.forEach((word, offset) => {
    const index = startIndex + offset;
    if (index < invitePartCount) next[index] = word;
  });
  return next;
};

const inviteCode = (parts: InviteParts) => parts.join(".");

const InviteCodeInput = ({ parts, setParts }: InviteCodeInputProps) => {
  const inputId = useId();
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const focusPart = (index: number) => {
    requestAnimationFrame(() => refs.current[index]?.focus());
  };

  const replaceFrom = (index: number, value: string) => {
    const words = splitInviteWords(value);
    if (words.length > 1) {
      setParts((current) => fillInviteParts(current, index, words));
      focusPart(Math.min(index + words.length, invitePartCount - 1));
      return;
    }

    setParts((current) => {
      const next = [...current] as InviteParts;
      next[index] = normalizeInviteWord(value);
      return next;
    });
  };

  const pasteFrom = (
    event: ClipboardEvent<HTMLInputElement>,
    index: number,
  ) => {
    const words = splitInviteWords(event.clipboardData.getData("text"));
    if (words.length === 0) return;

    event.preventDefault();
    setParts((current) => fillInviteParts(current, index, words));
    focusPart(Math.min(index + words.length, invitePartCount - 1));
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault();
      return;
    }

    if (event.key === " " || event.key === ".") {
      event.preventDefault();
      if (parts[index] && index < invitePartCount - 1) focusPart(index + 1);
      return;
    }

    if (event.key === "Backspace" && !parts[index] && index > 0) {
      event.preventDefault();
      focusPart(index - 1);
    }
  };

  return (
    <fieldset className="grid w-full grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-2">
      <legend className="sr-only">Invite code</legend>
      {parts.map((part, index) => (
        <div
          className="contents"
          key={`${inputId}-${index === 0 ? "first" : index === 1 ? "second" : "third"}`}
        >
          <input
            aria-label={`Invite code word ${index + 1}`}
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="h-11 min-w-0 border-mist-950/35 border-b bg-transparent px-0 text-center text-lg text-mist-950 lowercase outline-none transition-colors placeholder:text-mist-950/25 focus:border-mist-950 dark:border-mist-100/35 dark:text-mist-50 dark:placeholder:text-mist-100/25 dark:focus:border-mist-50"
            id={`${inputId}-${index}`}
            inputMode="text"
            onChange={(event) => replaceFrom(index, event.target.value)}
            onKeyDown={(event) => handleKey(event, index)}
            onPaste={(event) => pasteFrom(event, index)}
            placeholder="word"
            ref={(element) => {
              refs.current[index] = element;
            }}
            spellCheck={false}
            type="text"
            value={part}
          />
          {index < invitePartCount - 1 && (
            <span
              aria-hidden="true"
              className="pb-2 text-xl text-mist-950/45 dark:text-mist-100/45"
            >
              .
            </span>
          )}
        </div>
      ))}
    </fieldset>
  );
};

const formViewVariants = {
  animate: { filter: "blur(0px)", opacity: 1, scale: 1, y: 0 },
  exit: { filter: "blur(8px)", opacity: 0, scale: 0.985, y: -8 },
  initial: { filter: "blur(8px)", opacity: 0, scale: 0.985, y: 8 },
};

const reducedFormViewVariants = {
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  initial: { opacity: 0 },
};

const BrandTitle = ({
  className,
  text,
}: {
  className?: string | undefined;
  text: string;
}) => (
  <p className={cn("mb-4 text-center text-xl text-mist-900", className)}>
    {text}{" "}
    {text === "Sign into" && (
      <span className="font-black font-stretch-ultra-condensed text-mist-700 italic dark:text-mist-200">
        manual
      </span>
    )}
  </p>
);

const FormError = ({
  className,
  error,
}: {
  className?: string | undefined;
  error?: string | undefined;
}) =>
  error ? (
    <p
      className={cn("text-center text-red-700 text-sm", className)}
      role="alert"
    >
      {error}
    </p>
  ) : null;

/** Auth card: sign in, or switch to the three-word invite-code capture. */
export const AuthForm = ({
  cardClassName,
  controlClassName,
  errorClassName,
  linkClassName,
  submitClassName,
  titleClassName,
}: AuthFormProps = {}) => {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [parts, setParts] = useState<InviteParts>(blankInviteParts);
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );
  const reduceMotion = useReducedMotion();
  const transition = reduceMotion
    ? { duration: 0 }
    : { duration: 0.24, ease: "easeOut" as const };
  const variants = reduceMotion ? reducedFormViewVariants : formViewVariants;
  const switchLabel =
    mode === "sign-in" ? "Join with your invite code" : "Sign into manual";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <motion.div
        className={cn(
          "flex min-h-[360px] w-full max-w-sm flex-col items-center justify-center rounded-xl px-8 py-12",
          cardClassName,
        )}
        layout
        transition={transition}
      >
        <AnimatePresence initial={false} mode="wait">
          {mode === "sign-in" ? (
            <motion.div
              animate="animate"
              className="flex w-full flex-col items-center"
              exit="exit"
              initial="initial"
              key="sign-in"
              transition={transition}
              variants={variants}
            >
              <BrandTitle className={titleClassName} text="Sign into" />
              <form
                action={action}
                className="flex w-full flex-col items-stretch gap-2"
              >
                <input name="mode" type="hidden" value="sign-in" />
                <Input
                  autoComplete="username"
                  className={cn("w-full", controlClassName)}
                  name="username"
                  placeholder="Username"
                />
                <Input
                  autoComplete="current-password"
                  className={cn("w-full", controlClassName)}
                  name="password"
                  placeholder="Password"
                  type="password"
                />
                <Button
                  className={cn(submitClassName, "mt-2 w-full")}
                  disabled={pending}
                  type="submit"
                >
                  Sign in
                </Button>
              </form>
              <FormError className={errorClassName} error={state.error} />
            </motion.div>
          ) : (
            <motion.div
              animate="animate"
              className="flex w-full flex-col items-center"
              exit="exit"
              initial="initial"
              key="invite-code"
              transition={transition}
              variants={variants}
            >
              <BrandTitle
                className={titleClassName}
                text="Enter your invite code"
              />
              <div
                className="flex w-full flex-col items-stretch gap-2"
                data-invite-code={inviteCode(parts)}
              >
                <InviteCodeInput parts={parts} setParts={setParts} />
                <p className="mt-3 text-center text-mist-700 text-sm dark:text-mist-200">
                  Don&apos;t have an invite code? Ask me for one
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <AnimatePresence initial={false} mode="wait">
        <motion.button
          animate="animate"
          className={cn(
            "text-center text-mist-800/75 text-xs underline-offset-4 transition-colors hover:text-mist-950 hover:underline disabled:pointer-events-none disabled:opacity-50 dark:text-mist-100/75 dark:hover:text-mist-50",
            linkClassName,
          )}
          disabled={pending}
          exit="exit"
          initial="initial"
          key={mode}
          onClick={() =>
            setMode((current) =>
              current === "sign-in" ? "invite-code" : "sign-in",
            )
          }
          transition={transition}
          type="button"
          variants={variants}
        >
          {switchLabel}
        </motion.button>
      </AnimatePresence>
    </div>
  );
};
