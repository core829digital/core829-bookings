"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

export default function OrganizationPage() {
  const orgs = useQuery(api.organizations.list);
  const [activeSection, setActiveSection] = useState<"api-keys" | "webhooks">("api-keys");

  return (
    <div className="pt-6">
      <nav className="flex border-b border-border pb-4">
        <button
          onClick={() => setActiveSection("api-keys")}
          className={activeSection === "api-keys" ? "border-b-2 border-border text-accent" : "text-foreground-muted hover:text-accent"}
        >
          API Keys
        </button>
        <button
          onClick={() => setActiveSection("webhooks")}
          className={activeSection === "webhooks" ? "border-b-2 border-border text-accent" : "text-foreground-muted hover:text-accent"}
        >
          Webhooks
        </button>
      </nav>

      <div className="mt-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Organizzazione</h2>
        {orgs === undefined ? (
          <p className="text-foreground-muted">Caricamento…</p>
        ) : orgs.length === 0 ? (
          <p className="text-foreground-muted">Nessuna organizzazione.</p>
        ) : (
          <p className="text-foreground-muted">
            Sono {orgs.length} organizzazione. La gestione chiavi e webhooks è in corso di implementazione.
          </p>
        )}
      </div>
    </div>
  );
}