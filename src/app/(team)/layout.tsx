"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { DateTime } from "luxon";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/calendar", label: "Calendario" },
  { href: "/event-types", label: "Tipi di appuntamento" },
  { href: "/availability", label: "Disponibilità" },
  { href: "/organizations", label: "Organizzazioni" },
  { href: "/team", label: "Team" },
];

export default function TeamLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);
  const seedProfile = useMutation(api.users.seedProfile);
  const pathname = usePathname();
  const [name, setName] = useState("");

  if (currentUser === undefined) {
    return <main className="flex flex-1 items-center justify-center">Caricamento…</main>;
  }

  if (currentUser && currentUser.role === undefined) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24">
        <form
          className="w-full max-w-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            seedProfile({ name, timezone });
          }}
        >
          <h1 className="text-2xl font-semibold text-foreground">Completa il profilo</h1>
          <input
            className="input-core829"
            placeholder="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" className="w-full">
            Continua
          </Button>
        </form>
      </main>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-container items-center justify-between px-6 py-4">
          <nav className="flex gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "text-accent"
                    : "text-foreground-muted hover:text-foreground"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <span className="tech-label">
              {currentUser?.name} · {currentUser?.role}
            </span>
            <Button variant="secondary" onClick={() => void signOut()}>
              Esci
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-container flex-1 px-6 py-10">{children}</main>
    </div>
  );
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "Nuova",
  rescheduled: "Riprogrammata",
  cancelled: "Cancellata",
};

function NotificationBell() {
  const unseen = useQuery(api.bookings.listUnseenForMe);
  const markSeen = useMutation(api.bookings.markSeen);
  const markAllSeen = useMutation(api.bookings.markAllSeen);
  const [open, setOpen] = useState(false);

  const count = unseen?.length ?? 0;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative text-foreground-muted hover:text-foreground"
        aria-label="Notifiche"
      >
        🔔
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-white">
            {count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 border border-border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b border-border p-3">
            <span className="tech-label">Notifiche</span>
            {count > 0 && (
              <button
                className="link-ghost text-xs"
                onClick={() => markAllSeen({})}
              >
                Segna tutte come lette
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {count === 0 ? (
              <p className="p-4 text-sm text-foreground-muted">Nessuna novità.</p>
            ) : (
              unseen!.map((b) => (
                <button
                  key={b._id}
                  onClick={() => markSeen({ bookingId: b._id })}
                  className="block w-full border-b border-border p-3 text-left hover:bg-surface"
                >
                  <p className="text-xs font-medium text-accent">{STATUS_LABEL[b.status]}</p>
                  <p className="mt-0.5 text-sm text-foreground">{b.inviteeName}</p>
                  <p className="text-xs text-foreground-muted">
                    {DateTime.fromMillis(b.startTime, { zone: b.inviteeTimezone }).toFormat(
                      "d MMM, HH:mm"
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
