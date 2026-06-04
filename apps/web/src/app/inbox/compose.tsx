"use client";

import { useActionState } from "react";
import { type SendState, sendMessage } from "../actions";

/**
 * Minimal compose form. Posts to the `sendMessage` server action, which derives
 * `from` from the session and enqueues to egress. Skeleton only.
 */
export function Compose() {
  const [state, action, pending] = useActionState<SendState, FormData>(
    sendMessage,
    {},
  );

  return (
    <form action={action}>
      <input name="to" type="email" placeholder="To" />
      <input name="subject" placeholder="Subject" />
      <textarea name="text" placeholder="Message" />
      <button type="submit" disabled={pending}>
        Send
      </button>
      {state.status && <p>{state.status}</p>}
    </form>
  );
}
