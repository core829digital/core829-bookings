"use client";

import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type Role = "owner" | "admin" | "member";

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Membro",
};

export default function TeamPage() {
  const currentUser = useQuery(api.users.current);
  const team = useQuery(api.users.listTeam);
  const setRole = useMutation(api.users.setRole);

  const canManage =
    currentUser !== null &&
    currentUser !== undefined &&
    (currentUser.role === "owner" || currentUser.role === "admin");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Team</h1>
        {canManage && (
          <a href="/signin">
            <Button variant="secondary">Invita membro</Button>
          </a>
        )}
      </div>
      <p className="mt-1 text-sm text-foreground-muted">
        I nuovi account vengono creati dal proprietario su questo sistema; la
        registrazione self-service è disabilitata.
      </p>

      <div className="mt-8 space-y-3">
        {team === undefined ? (
          <p className="text-foreground-muted">Caricamento…</p>
        ) : team.length === 0 ? (
          <p className="text-foreground-muted">Nessun membro del team.</p>
        ) : (
          team.map((member) => (
            <div
              key={member._id}
              className="flex items-center justify-between border border-border p-4"
            >
              <div>
                <p className="text-foreground">
                  {member.name ?? "—"}
                  {member._id === currentUser?._id && (
                    <span className="tech-label ml-2">(tu)</span>
                  )}
                </p>
                <p className="text-sm text-foreground-muted">
                  {member.email ?? "—"} · {member.timezone ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {canManage && member._id !== currentUser?._id ? (
                  <select
                    className="input-core829 w-auto"
                    value={member.role ?? "member"}
                    onChange={(e) =>
                      void setRole({
                        userId: member._id as Id<"users">,
                        role: e.target.value as Role,
                      })
                    }
                  >
                    {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge tone={member.role === "owner" ? "red" : "outline"}>
                    {ROLE_LABELS[member.role ?? "member"]}
                  </Badge>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <GoogleCalendarCard />

      {canManage && <EmailAuditLog />}
    </div>
  );
}

const GOOGLE_STATUS_MESSAGE: Record<string, string> = {
  connected: "Google Calendar collegato.",
  access_denied: "Accesso negato — riprova e concedi il permesso al calendario.",
  missing_code: "Qualcosa è andato storto, riprova.",
  exchange_failed: "Impossibile completare il collegamento, riprova.",
};

function GoogleCalendarCard() {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");
  const status = useQuery(api.google.myConnectionStatus);
  const disconnect = useMutation(api.google.disconnect);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri =
    typeof window !== "undefined" ? `${window.location.origin}/api/google/callback` : "";
  const authUrl =
    clientId && redirectUri
      ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
          client_id: clientId,
          redirect_uri: redirectUri,
          response_type: "code",
          scope: "https://www.googleapis.com/auth/calendar.events",
          access_type: "offline",
          prompt: "consent",
        })}`
      : null;

  return (
    <div className="mt-12 border border-border p-6">
      <h2 className="text-lg font-semibold text-foreground">Google Calendar</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Collega il tuo Google Calendar: ogni prenotazione confermata verrà
        creata automaticamente come evento sul tuo calendario, e rimossa se
        cancellata o riprogrammata.
      </p>
      {googleStatus && (
        <p className="mt-3 text-sm text-accent">
          {GOOGLE_STATUS_MESSAGE[googleStatus] ?? googleStatus}
        </p>
      )}
      <div className="mt-4">
        {status === undefined ? null : status.connected ? (
          <div className="flex items-center gap-3">
            <Badge tone="surface">Collegato</Badge>
            <Button variant="secondary" onClick={() => disconnect({})}>
              Disconnetti
            </Button>
          </div>
        ) : authUrl ? (
          <a href={authUrl}>
            <Button variant="secondary">Collega Google Calendar</Button>
          </a>
        ) : (
          <p className="text-sm text-foreground-muted">
            Non ancora configurato lato server (manca NEXT_PUBLIC_GOOGLE_CLIENT_ID).
          </p>
        )}
      </div>
    </div>
  );
}

const EMAIL_TYPE_LABEL: Record<string, string> = {
  confirmation: "Conferma cliente",
  reminder: "Promemoria",
  office_notification: "Notifica ufficio",
};

function EmailAuditLog() {
  const logs = useQuery(api.emails.listRecentLogs);
  const failed = (logs ?? []).filter((l) => l.status === "failed");

  return (
    <div className="mt-12">
      <h2 className="text-lg font-semibold text-foreground">Registro email</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        Ultimi 100 tentativi di invio (conferme, promemoria, notifiche
        ufficio). {failed.length > 0 && (
          <span className="text-accent">{failed.length} falliti.</span>
        )}
      </p>
      <div className="mt-4 max-h-96 space-y-1.5 overflow-y-auto">
        {logs === undefined ? (
          <p className="text-foreground-muted">Caricamento…</p>
        ) : logs.length === 0 ? (
          <p className="text-foreground-muted">Nessun invio registrato.</p>
        ) : (
          logs.map((log) => (
            <div
              key={log._id}
              className={`flex items-center justify-between border p-2.5 text-sm ${
                log.status === "failed"
                  ? "border-red-500/40 bg-red-500/5"
                  : "border-border"
              }`}
            >
              <div>
                <span className="text-foreground">{EMAIL_TYPE_LABEL[log.type] ?? log.type}</span>
                <span className="ml-2 text-foreground-muted">→ {log.recipient}</span>
                {log.error && <span className="ml-2 text-xs text-red-600">{log.error}</span>}
              </div>
              <span className="tech-label whitespace-nowrap">
                {DateTime.fromMillis(log.createdAt).toFormat("d MMM, HH:mm")}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}