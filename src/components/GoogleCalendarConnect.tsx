"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const GOOGLE_STATUS_MESSAGE: Record<string, string> = {
  connected: "Google Calendar collegato.",
  access_denied: "Accesso negato — riprova e concedi il permesso al calendario.",
  missing_code: "Qualcosa è andato storto, riprova.",
  exchange_failed: "Impossibile completare il collegamento, riprova.",
};

function useGoogleAuthUrl(): string | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri =
    typeof window !== "undefined" ? `${window.location.origin}/api/google/callback` : "";
  if (!clientId || !redirectUri) return null;
  return `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  })}`;
}

interface Props {
  compact?: boolean;
}

export function GoogleCalendarConnect({ compact = false }: Props) {
  const searchParams = useSearchParams();
  const googleStatus = searchParams.get("google");
  const status = useQuery(api.google.myConnectionStatus);
  const disconnect = useMutation(api.google.disconnect);
  const authUrl = useGoogleAuthUrl();

  const loading = status === undefined;

  if (compact) {
    if (loading || !authUrl) return null;
    if (status.connected) {
      return (
        <Link href="/team">
          <Button variant="secondary" className="!min-h-9 !px-4 text-xs">
            Calendario collegato
          </Button>
        </Link>
      );
    }
    return (
      <a href={authUrl}>
        <Button variant="secondary" className="!min-h-9 !px-4 text-xs">
          Collega Google Calendar
        </Button>
      </a>
    );
  }

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
        {loading ? null : status.connected ? (
          <div className="flex items-center gap-3">
            <Badge tone="surface">Collegato</Badge>
            <Button variant="secondary" onClick={() => void disconnect({})}>
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