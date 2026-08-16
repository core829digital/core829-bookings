"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { BookingWidget } from "@/components/BookingWidget";

// Chrome-free version of the booking flow, meant to be embedded via
// <iframe src="https://bookings.core829.net/embed/[slug]"> on any site —
// core829.net's own homepage, or a paying client's site. No header/footer/
// nav here on purpose: the parent page provides its own surroundings.
//
// Theming: a cross-origin iframe cannot read the host page's CSS (browser
// security boundary), so "automatic" brand-matching means the embedder
// passes its own tokens once via query string, then it matches on every
// load with no further work — the standard pattern (Calendly, Stripe
// Elements). ?accent=%23e11d2e&font=Inter&logo=0
export default function EmbedBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const accent = searchParams.get("accent") ?? undefined;
  const font = searchParams.get("font") ?? undefined;
  const logo = searchParams.get("logo");

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <BookingWidget
        slug={slug}
        compact
        theme={{ accent, font, showLogo: logo !== "0" }}
      />
    </div>
  );
}
