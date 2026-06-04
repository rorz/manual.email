import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { listMessages, resolveMailbox } from "@/lib/mailbox";
import { Compose } from "./compose";

/**
 * Inbox: a signed-in user's messages plus a compose box. Skeleton only — no
 * styling, no pagination, no read/unread interactions yet.
 */
export default async function Inbox() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const mailbox = await resolveMailbox(session.user.email);
  if (!mailbox) redirect("/");

  const messages = await listMessages(mailbox.accountId);

  return (
    <main>
      <h1>Inbox — {mailbox.address}</h1>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <ul>
          {messages.map((m) => (
            <li key={m.id}>
              <strong>{m.subject ?? "(no subject)"}</strong> — {m.mailFrom}{" "}
              <time>{new Date(m.receivedAt).toLocaleString()}</time>
            </li>
          ))}
        </ul>
      )}
      <h2>Compose</h2>
      <Compose />
    </main>
  );
}
