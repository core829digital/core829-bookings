"use client";

import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { GoogleCalendarConnect } from "@/components/GoogleCalendarConnect";

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

      <GoogleCalendarConnect />

      {canManage && <EmailAuditLog />}
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