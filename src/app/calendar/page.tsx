"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

export default function CalendarPage() {
  const { signOut } = useAuthActions();
  const currentUser = useQuery(api.users.current);
  const seedProfile = useMutation(api.users.seedProfile);
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
    <main className="flex flex-1 flex-col px-6 py-24">
      <div className="mx-auto w-full max-w-container">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">
            Ciao, {currentUser?.name} ({currentUser?.role})
          </h1>
          <Button variant="secondary" onClick={() => void signOut()}>
            Esci
          </Button>
        </div>
        <p className="mt-4 text-foreground-muted">
          Calendario team — arriva nella Fase 2 del piano.
        </p>
      </div>
    </main>
  );
}
