"use client";

import { Button, Input, Textarea } from "@manual.email/ui";
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
      <Input className="max-w-sm" name="to" type="email" placeholder="To" />
      <Input className="max-w-sm" name="subject" placeholder="Subject" />
      <Textarea
        className="min-h-28 max-w-sm"
        name="text"
        placeholder="Message"
      />
      <Button type="submit" disabled={pending}>
        Send
      </Button>
      {state.status && <p>{state.status}</p>}
    </form>
  );
};
