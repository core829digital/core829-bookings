"use client";

import { use } from "react";
import { BookingWidget } from "@/components/BookingWidget";

// Chrome-free version of the booking flow, meant to be embedded via
// <iframe src="https://bookings.core829.net/embed/[slug]"> on any site —
// core829.net's own homepage, or a paying client's site. No header/footer/
// nav here on purpose: the parent page provides its own surroundings.
export default function EmbedBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <div className="min-h-screen bg-background px-4 py-4">
      <BookingWidget slug={slug} compact />
    </div>
  );
}
