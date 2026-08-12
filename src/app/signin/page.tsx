"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/Button";

export default function SignInPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          const formData = new FormData(e.currentTarget);
          formData.set("flow", flow);
          signIn("password", formData)
            .then(() => router.push("/calendar"))
            .catch(() => setError("Credenziali non valide."))
            .finally(() => setSubmitting(false));
        }}
      >
        <h1 className="text-2xl font-semibold text-foreground">
          {flow === "signIn" ? "Accedi" : "Crea account team"}
        </h1>
        <input
          className="input-core829"
          name="email"
          type="email"
          placeholder="Email"
          required
        />
        <input
          className="input-core829"
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {flow === "signIn" ? "Accedi" : "Registrati"}
        </Button>
        <button
          type="button"
          className="text-sm text-foreground-muted hover:text-accent"
          onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
        >
          {flow === "signIn"
            ? "Nuovo team member? Registrati"
            : "Hai già un account? Accedi"}
        </button>
      </form>
    </main>
  );
}
