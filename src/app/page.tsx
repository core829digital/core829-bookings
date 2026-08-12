"use client";

import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/Button";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="kicker mb-4">CORE829 · booking</p>
      <h1 className="text-4xl font-semibold text-foreground sm:text-5xl">
        bookings.core829.net
      </h1>
      <p className="mt-4 max-w-md text-foreground-muted">
        Sistema di prenotazione CORE829 — calendario, disponibilità e API
        booking per i siti del team.
      </p>
      {!isLoading && (
        <a href={isAuthenticated ? "/calendar" : "/signin"} className="mt-8 inline-block">
          <Button>{isAuthenticated ? "Vai alla dashboard" : "Accedi"}</Button>
        </a>
      )}
    </main>
  );
}
