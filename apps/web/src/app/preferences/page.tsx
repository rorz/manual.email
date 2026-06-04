import {
  buttonVariants,
  navItemVariants,
  PageHeader,
  PageShell,
} from "@manual.email/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { getFilterPreferences } from "@/lib/filter-preferences";
import { listMailboxView, resolveMailbox } from "@/lib/mailbox";
import { FilteringPreferences } from "./filtering";
import { TrayPreferences } from "./trays";

interface PreferencesProps {
  searchParams?: Promise<{ filter?: string; section?: string; tray?: string }>;
}

type PreferenceSection = "trays" | "filtering";

const Preferences = async ({ searchParams }: PreferencesProps) => {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const mailbox = await resolveMailbox(session.user.email);
  if (!mailbox) redirect("/");

  const params = await searchParams;
  const section: PreferenceSection =
    params?.section === "filtering" ? "filtering" : "trays";
  const [view, filter] = await Promise.all([
    listMailboxView(mailbox.accountId, null),
    getFilterPreferences(mailbox.accountId),
  ]);
  const tagTrays = view.trays.filter((tray) => tray.kind === "tag");
  const systemTrays = view.trays.filter((tray) => tray.kind !== "tag");

  return (
    <PageShell>
      <PageHeader
        action={
          <Link
            className={buttonVariants({ size: "sm", variant: "secondary" })}
            href="/inbox"
          >
            Inbox
          </Link>
        }
        eyebrow={mailbox.address}
        title="Preferences"
      />

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-[180px_minmax(0,1fr)] gap-8 px-6 py-6">
        <nav className="flex flex-col gap-1">
          <PreferenceLink
            href="/preferences?section=trays"
            selected={section === "trays"}
          >
            Trays
          </PreferenceLink>
          <PreferenceLink
            href="/preferences?section=filtering"
            selected={section === "filtering"}
          >
            Filtering
          </PreferenceLink>
        </nav>

        <section className="min-w-0">
          {section === "trays" ? (
            <TrayPreferences
              systemTrays={systemTrays}
              tags={view.tags}
              tagTrays={tagTrays}
              trayId={params?.tray ?? null}
            />
          ) : (
            <FilteringPreferences
              activeMode={
                params?.filter === "custom" || params?.filter === "managed"
                  ? params.filter
                  : filter.mode
              }
              filter={filter}
            />
          )}
        </section>
      </div>
    </PageShell>
  );
};

export default Preferences;

const PreferenceLink = ({
  children,
  href,
  selected,
}: {
  children: React.ReactNode;
  href: string;
  selected: boolean;
}) => (
  <Link className={navItemVariants({ selected })} href={href}>
    {children}
  </Link>
);
