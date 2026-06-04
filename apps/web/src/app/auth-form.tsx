"use client";

import { useActionState, useState } from "react";
import { type AuthState, authenticate } from "./actions";

/**
 * Email+password form. Posts to the `authenticate` server action, toggling
 * between sign-in and sign-up via a hidden `mode` field. Skeleton only.
 */
export function AuthForm() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [state, action, pending] = useActionState<AuthState, FormData>(
    authenticate,
    {},
  );

  return (
    <>
      <form action={action}>
        <input type="hidden" name="mode" value={mode} />
        {mode === "sign-up" && <input name="name" placeholder="Name" />}
        <input name="email" type="email" placeholder="Email" />
        <input name="password" type="password" placeholder="Password" />
        <button type="submit" disabled={pending}>
          {mode === "sign-up" ? "Sign up" : "Sign in"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => setMode(mode === "sign-up" ? "sign-in" : "sign-up")}
      >
        {mode === "sign-up" ? "Have an account? Sign in" : "Create an account"}
      </button>
      {state.error && <p role="alert">{state.error}</p>}
    </>
  );
}
