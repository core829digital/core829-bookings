"use client";

import { use } from "react";
import { useSearchParams } from "next/navigation";
import { BookingWidget } from "@/components/BookingWidget";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export default function BookEventTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const rescheduleToken = useSearchParams().get("reschedule");

  return (
    <>
      <PublicHeader />
      <BookingWidget slug={slug} rescheduleToken={rescheduleToken} />
      <PublicFooter />
    </>
  );
}
