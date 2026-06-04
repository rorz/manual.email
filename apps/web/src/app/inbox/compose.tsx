"use client";

import { useActionState } from "react";
import { type SendState, sendMessage } from "../actions";

/**
 * Minimal compose form. Posts to the `sendMessage` server action, which derives
 * `from` from the session and enqueues to egress. Skeleton only.
 */
export const Compose = () => {
  const [state, action, pending] = useActionState<SendState, FormData>(
    sendMessage,
    {},
  );

  return (
    <form className="flex flex-col items-start gap-2" action={action}>
      <input
        className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
        name="to"
        type="email"
        placeholder="To"
      />
      <input
        className="w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
        name="subject"
        placeholder="Subject"
      />
      <textarea
        className="min-h-28 w-full max-w-sm rounded border border-neutral-300 px-3 py-2"
        name="text"
        placeholder="Message"
      />
      <button
        className="rounded border border-neutral-300 px-4 py-2 disabled:opacity-50"
        type="submit"
        disabled={pending}
      >
        Send
      </button>
      {state.status && <p>{state.status}</p>}
    </form>
  );
};
