"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const LOCATION_LABELS: Record<string, string> = {
  google_meet: "Google Meet",
  phone: "Telefono",
  in_person: "Di persona",
  custom: "Altro",
};

export default function OrganizationBookingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = use(params);
  const data = useQuery(api.eventTypes.listByOrganizationSlug, { organizationSlug: orgSlug });

  if (data === undefined) {
    return (
      <>
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center">Caricamento…</main>
        <PublicFooter />
      </>
    );
  }
  if (data === null) {
    return (
      <>
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-foreground-muted">
          Questa pagina di prenotazione non esiste.
        </main>
        <PublicFooter />
      </>
    );
  }

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-container flex-1 px-6 py-16">
        <p className="kicker mb-2">Prenota con</p>
        <h1 className="text-3xl font-semibold text-foreground">{data.organizationName}</h1>

        {data.eventTypes.length === 0 ? (
          <p className="mt-8 text-foreground-muted">
            Nessun appuntamento disponibile al momento.
          </p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.eventTypes.map((et) => (
              <a
                key={et.slug}
                href={`/book/${et.slug}`}
                className="block border border-border bg-surface p-5 transition-colors hover:border-accent"
              >
                <p className="tech-label">{et.durationMinutes} min · {LOCATION_LABELS[et.location]}</p>
                <p className="mt-2 text-lg text-foreground">{et.name}</p>
                {et.description && (
                  <p className="mt-1 text-sm text-foreground-muted">{et.description}</p>
                )}
              </a>
            ))}
          </div>
        )}

        <p className="mt-12 text-xs text-foreground-muted">
          Sistema di prenotazione fornito da{" "}
          <Link href="/" className="link-ghost">
            CORE829
          </Link>
          .
        </p>
      </main>
      <PublicFooter />
    </>
  );
}
