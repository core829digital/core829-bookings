"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const ALL_SCOPES = ["event-types:read", "bookings:read", "bookings:write"] as const;
const ALL_EVENTS = ["booking.created", "booking.rescheduled", "booking.cancelled"] as const;

export default function OrganizationsPage() {
  const currentUser = useQuery(api.users.current);
  const orgs = useQuery(api.organizations.list);
  const createOrg = useMutation(api.organizations.create);
  const [selectedOrgId, setSelectedOrgId] = useState<Id<"organizations"> | null>(null);
  const [showNewOrg, setShowNewOrg] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgError, setOrgError] = useState<string | null>(null);

  const canManage =
    currentUser !== null &&
    currentUser !== undefined &&
    (currentUser.role === "owner" || currentUser.role === "admin");

  const selected = (orgs ?? []).find((o) => o.org._id === selectedOrgId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Organizzazioni</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Siti esterni con accesso API a questo sistema di booking (Fase 3).
          </p>
        </div>
        {canManage && (
          <Button onClick={() => setShowNewOrg((s) => !s)}>
            {showNewOrg ? "Chiudi" : "+ Nuova organizzazione"}
          </Button>
        )}
      </div>

      {showNewOrg && (
        <form
          className="mt-6 flex gap-3 border border-border bg-surface p-6"
          onSubmit={(e) => {
            e.preventDefault();
            setOrgError(null);
            createOrg({ name: orgName, plan: "free" })
              .then(() => {
                setOrgName("");
                setShowNewOrg(false);
              })
              .catch(() => setOrgError("Nome o slug già in uso."));
          }}
        >
          <input
            className="input-core829"
            placeholder="Nome organizzazione"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            required
          />
          <Button type="submit">Crea</Button>
          {orgError && <p className="self-center text-sm text-accent">{orgError}</p>}
        </form>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-2">
          {orgs === undefined ? (
            <p className="text-foreground-muted">Caricamento…</p>
          ) : orgs.length === 0 ? (
            <p className="text-foreground-muted">Nessuna organizzazione creata.</p>
          ) : (
            orgs.map(({ org, keyCount, webhookCount }) => (
              <button
                key={org._id}
                onClick={() => setSelectedOrgId(org._id)}
                className={`block w-full border p-4 text-left transition-colors ${
                  selectedOrgId === org._id
                    ? "border-accent bg-surface"
                    : "border-border hover:border-foreground"
                }`}
              >
                <p className="text-foreground">{org.name}</p>
                <p className="tech-label mt-1">
                  {keyCount} chiavi · {webhookCount} webhook
                </p>
              </button>
            ))
          )}
        </div>

        <div>
          {selected ? (
            <OrgDetail organizationId={selected.org._id} canManage={canManage} />
          ) : (
            <p className="text-foreground-muted">Seleziona un&apos;organizzazione.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function OrgDetail({
  organizationId,
  canManage,
}: {
  organizationId: Id<"organizations">;
  canManage: boolean;
}) {
  const bookings = useQuery(api.bookings.listForOrganization, { organizationId });
  const keys = useQuery(api.organizations.listKeysForOrg, { organizationId });
  const issueKey = useMutation(api.organizations.issueKey);
  const revokeKey = useMutation(api.organizations.revokeKey);
  const endpoints = useQuery(api.webhooks.listEndpointsForOrg, { organizationId });
  const deliveries = useQuery(api.webhooks.listDeliveriesForOrg, { organizationId });
  const createEndpoint = useMutation(api.webhooks.createEndpoint);
  const resendDelivery = useMutation(api.webhooks.resendDelivery);

  const [keyName, setKeyName] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("test");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...ALL_SCOPES]);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([...ALL_EVENTS]);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-lg font-semibold text-foreground">Prenotazioni</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Prenotazioni fatte tramite un tipo di appuntamento assegnato a
          questa organizzazione (widget incorporato, pagina ospitata, o API).
        </p>
        <div className="mt-4 space-y-2">
          {bookings === undefined ? (
            <p className="text-foreground-muted">Caricamento…</p>
          ) : bookings.length === 0 ? (
            <p className="text-foreground-muted">
              Nessuna prenotazione ancora. Assegna un tipo di appuntamento a
              questa organizzazione in /event-types.
            </p>
          ) : (
            bookings.map((b) => (
              <div key={b._id} className="border border-border p-3">
                <p className="text-foreground">
                  {DateTime.fromMillis(b.startTime, { zone: b.inviteeTimezone }).toFormat(
                    "d MMM yyyy, HH:mm"
                  )}{" "}
                  <span className="tech-label ml-2">{b.status}</span>
                </p>
                <p className="text-sm text-foreground-muted">
                  {b.inviteeName} · {b.inviteeEmail}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Chiavi API</h2>

        {revealedKey && (
          <div className="mt-4 border border-accent bg-accent/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Copia questa chiave ora — non verrà mostrata di nuovo.
            </p>
            <code className="mt-2 block break-all font-mono text-sm text-accent">
              {revealedKey}
            </code>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => setRevealedKey(null)}
            >
              Ho copiato la chiave
            </Button>
          </div>
        )}

        {canManage && !revealedKey && (
          <form
            className="mt-4 grid gap-3 border border-border bg-surface p-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              issueKey({
                organizationId,
                name: keyName,
                environment,
                scopes: selectedScopes,
              }).then((result) => {
                setRevealedKey(result.fullKey);
                setKeyName("");
              });
            }}
          >
            <input
              className="input-core829"
              placeholder="Nome chiave (es. Sito produzione)"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              required
            />
            <select
              className="input-core829"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value as "live" | "test")}
            >
              <option value="test">Test</option>
              <option value="live">Live</option>
            </select>
            <div className="flex flex-wrap gap-3 sm:col-span-2">
              {ALL_SCOPES.map((scope) => (
                <label key={scope} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={(e) =>
                      setSelectedScopes((s) =>
                        e.target.checked ? [...s, scope] : s.filter((x) => x !== scope)
                      )
                    }
                  />
                  {scope}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={selectedScopes.length === 0} className="sm:col-span-2 w-auto">
              Genera chiave
            </Button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {(keys ?? []).map((key) => (
            <div
              key={key._id}
              className="flex items-center justify-between border border-border p-3"
            >
              <div>
                <p className="text-foreground">
                  {key.name} <span className="tech-label ml-2">{key.prefix}…</span>
                </p>
                <p className="text-sm text-foreground-muted">
                  {key.environment} · {key.scopes.join(", ")} ·{" "}
                  {key.status === "active" ? (
                    <Badge tone="surface">attiva</Badge>
                  ) : (
                    <Badge tone="outline">revocata</Badge>
                  )}
                </p>
              </div>
              {canManage && key.status === "active" && (
                <Button variant="secondary" onClick={() => revokeKey({ apiKeyId: key._id })}>
                  Revoca
                </Button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Webhook endpoint</h2>

        {revealedSecret && (
          <div className="mt-4 border border-accent bg-accent/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Secret HMAC — copialo ora, non verrà mostrato di nuovo.
            </p>
            <code className="mt-2 block break-all font-mono text-sm text-accent">
              {revealedSecret}
            </code>
            <Button
              variant="secondary"
              className="mt-3"
              onClick={() => setRevealedSecret(null)}
            >
              Ho copiato il secret
            </Button>
          </div>
        )}

        {canManage && !revealedSecret && (
          <form
            className="mt-4 grid gap-3 border border-border bg-surface p-4"
            onSubmit={(e) => {
              e.preventDefault();
              createEndpoint({
                organizationId,
                url: webhookUrl,
                events: webhookEvents,
              }).then((result) => {
                setRevealedSecret(result.secret);
                setWebhookUrl("");
              });
            }}
          >
            <input
              className="input-core829"
              placeholder="https://example.com/webhooks/core829"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-3">
              {ALL_EVENTS.map((event) => (
                <label key={event} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes(event)}
                    onChange={(e) =>
                      setWebhookEvents((evts) =>
                        e.target.checked ? [...evts, event] : evts.filter((x) => x !== event)
                      )
                    }
                  />
                  {event}
                </label>
              ))}
            </div>
            <Button type="submit" disabled={webhookEvents.length === 0} className="w-auto">
              Aggiungi endpoint
            </Button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {(endpoints ?? []).map((endpoint) => (
            <div key={endpoint._id} className="border border-border p-3">
              <p className="break-all text-foreground">{endpoint.url}</p>
              <p className="text-sm text-foreground-muted">
                {endpoint.events.join(", ")} · {endpoint.status}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-foreground">Consegne webhook recenti</h2>
        <div className="mt-4 space-y-2">
          {(deliveries ?? []).length === 0 ? (
            <p className="text-foreground-muted">Nessuna consegna registrata.</p>
          ) : (
            (deliveries ?? []).map((d) => (
              <div
                key={d._id}
                className="flex items-center justify-between border border-border p-3"
              >
                <div>
                  <p className="text-foreground">
                    {d.event} <span className="tech-label ml-2">{d.status}</span>
                  </p>
                  <p className="text-sm text-foreground-muted">
                    {DateTime.fromMillis(d.createdAt).toFormat("d MMM yyyy, HH:mm")} · tentativi:{" "}
                    {d.attempts}
                    {d.lastError ? ` · ${d.lastError}` : ""}
                  </p>
                </div>
                {canManage && (d.status === "failed" || d.status === "exhausted") && (
                  <Button
                    variant="secondary"
                    onClick={() => resendDelivery({ deliveryId: d._id })}
                  >
                    Reinvia
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
