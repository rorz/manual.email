import {
  Badge,
  buttonVariants,
  cn,
  EmptyState,
  NewTrayGlyph,
  navItemVariants,
  PageHeader,
  PageShell,
  panelVariants,
  SectionKicker,
  SystemTrayGlyph,
  TrayGlyph,
} from "@manual.email/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import {
  listMailboxView,
  type MailMessage,
  type MailTag,
  type MailTray,
  resolveMailbox,
} from "@/lib/mailbox";
import { Compose } from "./compose";

interface InboxProps {
  searchParams?: Promise<{ tray?: string }>;
}

const Inbox = async ({ searchParams }: InboxProps) => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const mailbox = await resolveMailbox(session.user.email);
  if (!mailbox) redirect("/");

  const params = await searchParams;
  const view = await listMailboxView(mailbox.accountId, params?.tray ?? null);
  const tagTrays = view.trays.filter((tray) => tray.kind === "tag");
  const systemTrays = view.trays.filter((tray) => tray.kind !== "tag");

  return (
    <PageShell>
      <PageHeader
        action={
          <Link
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            href="/preferences"
          >
            Preferences
          </Link>
        }
        eyebrow={mailbox.address}
        title="Inbox"
      />

      <div className="grid min-h-0 flex-1 grid-cols-[220px_minmax(0,1fr)_340px]">
        <aside className="flex min-h-0 flex-col border-neutral-200 border-r px-4 py-5">
          <SectionKicker className="mb-3">Trays</SectionKicker>
          <nav className="flex flex-col gap-1">
            {tagTrays.map((tray) => (
              <TrayLink
                key={tray.id}
                selected={tray.id === view.selectedTray?.id}
                tray={tray}
              />
            ))}
            <Link
              className={cn(
                buttonVariants({ variant: "dashed" }),
                "mt-1 gap-2",
              )}
              href="/preferences?section=trays#new-tray"
            >
              <NewTrayGlyph />
              <span>New tray</span>
            </Link>
          </nav>
          <nav className="mt-auto flex flex-col gap-1 border-neutral-200 border-t pt-3">
            {systemTrays.map((tray) => (
              <TrayLink
                key={tray.id}
                selected={tray.id === view.selectedTray?.id}
                tray={tray}
              />
            ))}
          </nav>
        </aside>

        <section className="min-w-0 px-5 py-5">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {view.selectedTray?.name ?? "Messages"}
              </h2>
              <p className="text-neutral-500 text-sm">
                {view.messages.length}{" "}
                {view.messages.length === 1 ? "message" : "messages"}
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              {view.tags.map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
            </div>
          </div>

          {view.messages.length === 0 ? (
            <EmptyState>No messages in this tray.</EmptyState>
          ) : (
            <ul className="flex flex-col gap-2">
              {view.messages.map((message) => (
                <MessageRow key={message.id} message={message} />
              ))}
            </ul>
          )}
        </section>

        <aside className="border-neutral-200 border-l px-4 py-5">
          <SectionKicker className="mb-3">Compose</SectionKicker>
          <Compose />
        </aside>
      </div>
    </PageShell>
  );
};

export default Inbox;

const TrayLink = ({
  selected,
  tray,
}: {
  selected: boolean;
  tray: MailTray;
}) => (
  <Link
    className={cn(
      navItemVariants({ selected }),
      "flex items-center justify-between gap-2",
    )}
    href={`/inbox?tray=${tray.id}`}
  >
    <span className="flex min-w-0 items-center gap-2">
      <TrayEntryIcon selected={selected} tray={tray} />
      <span className="truncate">{tray.name}</span>
    </span>
    {tray.kind === "tag" ? (
      <span className={selected ? "text-neutral-300" : "text-neutral-400"}>
        {tray.tags.length}
      </span>
    ) : null}
  </Link>
);

const TrayEntryIcon = ({
  selected,
  tray,
}: {
  selected: boolean;
  tray: MailTray;
}) => {
  if (tray.kind === "tag") {
    return <TrayGlyph color={selected ? null : tray.color} icon={tray.icon} />;
  }
  if (tray.kind === "everything" || tray.kind === "quarantine") {
    return <SystemTrayGlyph kind={tray.kind} />;
  }
  return null;
};

const MessageRow = ({ message }: { message: MailMessage }) => (
  <li className={cn(panelVariants(), "px-4 py-3")}>
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="truncate font-medium">
          {message.subject ?? "(no subject)"}
        </h3>
        <p className="truncate text-neutral-500 text-sm">{message.mailFrom}</p>
      </div>
      <time className="shrink-0 font-mono text-neutral-400 text-xs">
        {new Date(message.receivedAt).toLocaleString()}
      </time>
    </div>
    {message.tags.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-1">
        {message.tags.map((tag) => (
          <TagPill key={tag.id} tag={tag} />
        ))}
      </div>
    ) : null}
  </li>
);

const TagPill = ({ tag }: { tag: MailTag }) => {
  const color = tag.color ?? (tag.slug === "important" ? "#a16207" : "#525252");

  return (
    <Badge className="bg-white" style={{ borderColor: color, color }}>
      {tag.label}
    </Badge>
  );
};
