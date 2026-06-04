import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { listMessages, resolveMailbox } from "@/lib/mailbox";
import { Compose } from "./compose";

/**
 * Inbox: a signed-in user's messages plus a compose box. Skeleton only — no
 * styling, no pagination, no read/unread interactions yet.
 */
const Inbox = async () => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const mailbox = await resolveMailbox(session.user.email);
  if (!mailbox) redirect("/");

  const messages = await listMessages(mailbox.accountId);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Inbox — {mailbox.address}</h1>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {messages.map((m) => (
            <li
              className="rounded border border-neutral-300 px-3 py-2"
              key={m.id}
            >
              <strong>{m.subject ?? "(no subject)"}</strong> — {m.mailFrom}{" "}
              <time>{new Date(m.receivedAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
      <h2 className="text-lg font-semibold">Compose</h2>
      <Compose />
    </main>
  );
};

export default Inbox;
