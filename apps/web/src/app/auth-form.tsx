"use client";

import { Button, buttonVariants, Input } from "@manual.email/ui";
import { useActionState, useState } from "react";
import { type AuthState, authenticate } from "./actions";

/**
 * Username+password form. Posts to the `authenticate` server action, toggling
 * between sign-in and sign-up via a hidden `mode` field. Your username is your
 * address local-part — no email required. Skeleton only.
 */
export const AuthForm = () => {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  return (
    <>
      <form className="flex flex-col items-start gap-2" action={action}>
        <input type="hidden" name="mode" value={mode} />
        <Input
          className="max-w-sm"
          name="username"
          placeholder="Username"
          autoComplete="username"
        />
        <Input
          className="max-w-sm"
          name="password"
          type="password"
          placeholder="Password"
        />
        <Button type="submit" disabled={pending}>
          {mode === "sign-up" ? "Sign up" : "Sign in"}
        </Button>
      </form>
      <button
        className={buttonVariants({ variant: "link" })}
        type="button"
        onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
      >
        {mode === "sign-up" ? "Have an account? Sign in" : "Create an account"}
      </button>
      {state.error && (
        <p className="text-red-700" role="alert">
          {state.error}
        </p>
      )}
    </>
  );
};
