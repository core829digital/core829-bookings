"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

const LOCATIONS = [
  { value: "google_meet", label: "Google Meet" },
  { value: "phone", label: "Telefono" },
  { value: "in_person", label: "Di persona" },
  { value: "custom", label: "Altro" },
] as const;

export default function EventTypesPage() {
  const eventTypes = useQuery(api.eventTypes.listMine);
  const organizations = useQuery(api.organizations.list);
  const update = useMutation(api.eventTypes.update);
  const remove = useMutation(api.eventTypes.remove);
  const [showForm, setShowForm] = useState(false);

  const orgNameById = new Map((organizations ?? []).map((o) => [o.org._id, o.org.name]));
  const orgSlugById = new Map((organizations ?? []).map((o) => [o.org._id, o.org.slug]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Tipi di appuntamento</h1>
        <Button onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Chiudi" : "+ Nuovo tipo"}
        </Button>
      </div>

      {showForm && (
        <div className="mt-6 border border-border bg-surface p-6">
          <NewEventTypeForm onDone={() => setShowForm(false)} />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {eventTypes === undefined ? (
          <p className="text-foreground-muted">Caricamento…</p>
        ) : eventTypes.length === 0 ? (
          <p className="text-foreground-muted">Nessun tipo di appuntamento creato.</p>
        ) : (
          eventTypes.map((et) => (
            <div
              key={et._id}
              className="flex items-center justify-between border border-border p-4"
            >
              <div>
                <p className="text-foreground">
                  {et.name}{" "}
                  <span className="tech-label ml-2">{et.durationMinutes} min</span>
                  {!et.active && (
                    <span className="ml-2 text-sm text-foreground-muted">(disattivato)</span>
                  )}
                </p>
                <p className="text-sm text-foreground-muted">
                  /book/{et.slug}
                  {et.organizationId && (
                    <>
                      {" · "}
                      {orgNameById.get(et.organizationId) ?? "organizzazione"} (/o/
                      {orgSlugById.get(et.organizationId) ?? "…"})
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() =>
                    update({ eventTypeId: et._id as Id<"eventTypes">, active: !et.active })
                  }
                >
                  {et.active ? "Disattiva" : "Attiva"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => remove({ eventTypeId: et._id as Id<"eventTypes"> })}
                >
                  Elimina
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewEventTypeForm({ onDone }: { onDone: () => void }) {
  const currentUser = useQuery(api.users.current);
  const organizations = useQuery(api.organizations.list);
  const create = useMutation(api.eventTypes.create);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]["value"]>("google_meet");
  const [description, setDescription] = useState("");
  const [organizationId, setOrganizationId] = useState<Id<"organizations"> | "">("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canAssignOrg = currentUser?.role === "owner" || currentUser?.role === "admin";

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSubmitting(true);
        create({
          name,
          slug,
          description: description || undefined,
          durationMinutes,
          location,
          bufferBeforeMinutes: 5,
          bufferAfterMinutes: 5,
          minNoticeMinutes: 60,
          maxAdvanceDays: 30,
          organizationId: organizationId || undefined,
        })
          .then(() => onDone())
          .catch(() => setError("Slug già in uso."))
          .finally(() => setSubmitting(false));
      }}
    >
      <input
        className="input-core829"
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="input-core829"
        placeholder="slug-url"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        pattern="[a-z0-9-]+"
        required
      />
      <input
        className="input-core829"
        type="number"
        min={5}
        placeholder="Durata (minuti)"
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value))}
        required
      />
      <select
        className="input-core829"
        value={location}
        onChange={(e) => setLocation(e.target.value as (typeof LOCATIONS)[number]["value"])}
      >
        {LOCATIONS.map((loc) => (
          <option key={loc.value} value={loc.value}>
            {loc.label}
          </option>
        ))}
      </select>
      <textarea
        className="input-core829 sm:col-span-2"
        placeholder="Descrizione (opzionale)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
      />
      {canAssignOrg && (
        <select
          className="input-core829 sm:col-span-2"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value as Id<"organizations">)}
        >
          <option value="">CORE829 (interno) — su /book/{slug || "slug"}</option>
          {(organizations ?? []).map(({ org }) => (
            <option key={org._id} value={org._id}>
              {org.name} — su /o/{org.slug}
            </option>
          ))}
        </select>
      )}
      {error && <p className="text-sm text-accent sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={submitting} className="sm:col-span-2">
        Crea
      </Button>
    </form>
  );
}
