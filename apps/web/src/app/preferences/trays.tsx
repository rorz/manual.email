import {
  Badge,
  Button,
  buttonVariants,
  cn,
  Panel,
  SectionHeader,
  SystemTrayGlyph,
  TrayGlyph,
} from "@manual.email/ui";
import Link from "next/link";
import {
  createTrayAction,
  deleteTrayAction,
  updateTrayAction,
} from "@/app/actions";
import type { MailTag, MailTray } from "@/lib/mailbox";
import { TrayForm } from "./tray-form";

export const TrayPreferences = ({
  systemTrays,
  tags,
  tagTrays,
  trayId,
}: {
  systemTrays: MailTray[];
  tags: MailTag[];
  tagTrays: MailTray[];
  trayId: string | null;
}) => {
  const editingTray = tagTrays.find((tray) => tray.id === trayId);
  const adding = trayId === "new";

  return (
    <div className="flex flex-col gap-4">
      <section>
        <SectionHeader
          action={
            <Link
              className={buttonVariants({ size: "sm", variant: "primary" })}
              href="/preferences?section=trays&tray=new#new-tray"
            >
              New tray
            </Link>
          }
          title="Trays"
        />
        <Panel className="mt-3 overflow-hidden">
          {tagTrays.map((tray) => (
            <div
              className="border-neutral-100 border-b last:border-b-0"
              key={tray.id}
            >
              <TrayRow active={tray.id === trayId} tray={tray} />
              {tray.id === trayId ? (
                <TrayEditor tags={tags} tray={tray} />
              ) : null}
            </div>
          ))}
        </Panel>
      </section>

      {adding ? (
        <section id="new-tray">
          <EditorShell title="New tray">
            <TrayForm action={createTrayAction} tags={tags} />
            <CancelLink />
          </EditorShell>
        </section>
      ) : null}

      <section className="border-neutral-200 border-t pt-4">
        <div className="flex flex-col gap-1">
          {systemTrays.map((tray) => (
            <SystemTray key={tray.id} tray={tray} />
          ))}
        </div>
      </section>

      {trayId && !adding && !editingTray ? (
        <p className="text-neutral-500 text-sm">Tray not found.</p>
      ) : null}
    </div>
  );
};

const TrayRow = ({ active, tray }: { active: boolean; tray: MailTray }) => (
  <div
    className={cn(
      "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2",
      active && "bg-neutral-50",
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-md bg-neutral-100">
        <TrayGlyph color={tray.color} icon={tray.icon} />
      </span>
      <div className="min-w-0">
        <div className="truncate font-medium text-sm">{tray.name}</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {tray.tags.map((tag) => (
            <Badge className="text-neutral-500" key={tag.id}>
              {tag.label}
            </Badge>
          ))}
        </div>
      </div>
    </div>
    <Link
      className={buttonVariants({ size: "sm", variant: "subtle" })}
      href={`/preferences?section=trays&tray=${tray.id}`}
    >
      Edit
    </Link>
  </div>
);

const TrayEditor = ({ tags, tray }: { tags: MailTag[]; tray: MailTray }) => (
  <EditorShell title={`Edit ${tray.name}`}>
    <TrayForm action={updateTrayAction} tags={tags} tray={tray} />
    <div className="mt-3 flex gap-2">
      <form action={deleteTrayAction}>
        <input name="trayId" type="hidden" value={tray.id} />
        <Button size="sm" type="submit" variant="danger">
          Delete
        </Button>
      </form>
      <CancelLink />
    </div>
  </EditorShell>
);

const EditorShell = ({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) => (
  <div className="border-neutral-200 border-t bg-neutral-50 p-3">
    <h3 className="mb-3 font-medium text-neutral-600 text-sm">{title}</h3>
    {children}
  </div>
);

const CancelLink = () => (
  <Link
    className={buttonVariants({ size: "sm", variant: "secondary" })}
    href="/preferences?section=trays"
  >
    Cancel
  </Link>
);

const SystemTray = ({ tray }: { tray: MailTray }) => (
  <div className="flex items-center gap-2 rounded-md px-3 py-1.5 text-neutral-500 text-sm">
    {tray.kind === "everything" || tray.kind === "quarantine" ? (
      <SystemTrayGlyph kind={tray.kind} />
    ) : null}
    <span>{tray.name}</span>
  </div>
);
