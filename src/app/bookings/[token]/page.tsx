"use client";

import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

export default function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const data = useQuery(api.bookings.getByCancelToken, { cancelToken: token });
  const cancelBooking = useMutation(api.bookings.cancel);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  if (data === undefined) {
    return (
      <>
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center">{t("widget_loading")}</main>
        <PublicFooter />
      </>
    );
  }
  if (data === null || data.eventType === null) {
    return (
      <>
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center text-foreground-muted">
          {t("manage_notFound")}
        </main>
        <PublicFooter />
      </>
    );
  }

  const { booking, eventType } = data;
  const bookerTz = booking.inviteeTimezone;

  return (
    <>
      <PublicHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-6 py-24">
        <p className="kicker mb-2">{eventType!.name}</p>
        <h1 className="text-2xl font-semibold text-foreground">
          {DateTime.fromMillis(booking.startTime, { zone: bookerTz }).toFormat(
            "cccc d MMMM yyyy, HH:mm"
          )}
        </h1>
        <p className="mt-2 text-foreground-muted">
          {booking.inviteeName} · {booking.inviteeEmail}
        </p>

        {booking.status === "cancelled" && (
          <p className="mt-6 text-accent">{t("manage_cancelled")}</p>
        )}
        {booking.status === "rescheduled" && (
          <p className="mt-6 text-foreground-muted">{t("manage_rescheduled")}</p>
        )}
        {booking.status === "confirmed" && (
          <div className="mt-6 flex gap-3">
            <a href={`/book/${eventType!.slug}?reschedule=${token}`}>
              <Button variant="secondary">{t("manage_reschedule")}</Button>
            </a>
            <Button
              variant="secondary"
              disabled={cancelling}
              onClick={() => {
                setError(null);
                setCancelling(true);
                cancelBooking({ cancelToken: token })
                  .catch(() => setError(t("manage_cancelError")))
                  .finally(() => setCancelling(false));
              }}
            >
              {t("manage_cancel")}
            </Button>
          </div>
        )}
        {error && <p className="mt-4 text-sm text-accent">{error}</p>}
      </main>
      <PublicFooter />
    </>
  );
}
