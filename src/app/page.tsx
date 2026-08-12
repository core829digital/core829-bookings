"use client";

import Image from "next/image";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/Button";

const FEATURES = [
  "Calendario realtime per il team",
  "Booking pubblico con slot timezone-aware",
  "API key per i siti esterni CORE829",
];

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <Image
        src="/core829branding/core829-banner.webp"
        alt=""
        fill
        priority
        className="object-cover"
      />
      <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-24 sm:px-12 lg:px-20">
        <p className="text-xs uppercase tracking-[0.25em] text-white/70">
          CORE829 · booking
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-semibold text-white sm:text-5xl">
          bookings.core829.net
        </h1>
        <p className="mt-4 max-w-md text-white/80">
          Sistema di prenotazione CORE829 — calendario, disponibilità e API
          booking per i siti del team.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-white/70">
          {FEATURES.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <span className="text-white">→</span>
              {feature}
            </li>
          ))}
        </ul>
        {!isLoading && (
          <a href={isAuthenticated ? "/calendar" : "/signin"} className="mt-8 inline-block w-fit">
            <Button
              variant="secondary"
              className="border-white text-white hover:bg-white hover:text-foreground"
            >
              {isAuthenticated ? "Vai alla dashboard" : "Accedi"}
            </Button>
          </a>
        )}
      </div>
    </main>
  );
}
