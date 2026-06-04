"use client";

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
        <input
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
          name="username"
          placeholder="Username"
          autoComplete="username"
        />
        <input
          className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
          name="password"
          type="password"
          placeholder="Password"
        />
        <button
          className="rounded border border-neutral-300 px-4 py-2 disabled:opacity-50"
          type="submit"
          disabled={pending}
        >
          {mode === "sign-up" ? "Sign up" : "Sign in"}
        </button>
      </form>
      <button
        className="text-blue-600 underline"
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
