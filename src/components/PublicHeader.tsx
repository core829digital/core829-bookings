"use client";

import Image from "next/image";
import Link from "next/link";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/Button";

export function PublicHeader() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-container items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/core829branding/core829-logo.webp" alt="CORE829" width={28} height={28} />
          <span className="text-sm font-medium text-foreground">CORE829 Bookings</span>
        </Link>
        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="/pricing" className="text-sm text-foreground-muted hover:text-foreground">
            Prezzi
          </Link>
        </nav>
        {!isLoading && (
          <Link href={isAuthenticated ? "/calendar" : "/signin"}>
            <Button variant="secondary">
              {isAuthenticated ? "Dashboard" : "Accedi"}
            </Button>
          </Link>
        )}
      </div>
    </header>
  );
}
