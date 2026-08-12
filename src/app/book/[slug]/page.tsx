"use client";

import { use, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

const WINDOW_DAYS = 7;

export default function BookEventTypePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const rescheduleToken = useSearchParams().get("reschedule");
  const eventType = useQuery(api.eventTypes.getBySlug, { slug });
  const bookerTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<{
    startTime: number;
    endTime: number;
  } | null>(null);
  const [confirmation, setConfirmation] = useState<{ cancelToken: string } | null>(
    null
  );

  const dateFrom = DateTime.now()
    .setZone(bookerTimezone)
    .plus({ days: weekOffset * WINDOW_DAYS })
    .toISODate()!;
  const dateTo = DateTime.now()
    .setZone(bookerTimezone)
    .plus({ days: weekOffset * WINDOW_DAYS + WINDOW_DAYS - 1 })
    .toISODate()!;

  const slots = useQuery(
    api.slots.getAvailableSlots,
    eventType ? { eventTypeSlug: slug, dateFrom, dateTo, timezone: bookerTimezone } : "skip"
  );

  if (eventType === undefined) {
    return <main className="flex flex-1 items-center justify-center">Caricamento…</main>;
  }
  if (eventType === null) {
    return (
      <main className="flex flex-1 items-center justify-center text-foreground-muted">
        Questo tipo di appuntamento non esiste o non è più disponibile.
      </main>
    );
  }

  if (confirmation) {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-24 text-center">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Prenotazione confermata</h1>
          <p className="mt-2 text-foreground-muted">
            Riceverai un&apos;email di conferma a breve.
          </p>
          <a
            href={`/bookings/${confirmation.cancelToken}`}
            className="link-ghost mt-6 inline-block"
          >
            Gestisci la prenotazione
          </a>
        </div>
      </main>
    );
  }

  const slotsByDay = new Map<string, { startTime: number; endTime: number }[]>();
  for (const slot of slots ?? []) {
    const day = DateTime.fromMillis(slot.startTime, { zone: bookerTimezone }).toISODate()!;
    const list = slotsByDay.get(day) ?? [];
    list.push(slot);
    slotsByDay.set(day, list);
  }
  // Show every day in the window, even ones with zero slots — a day that's
  // closed (no availability rule, e.g. weekends) and a day that's fully
  // booked both used to just vanish from the grid, which read as a bug.
  const daysInWindow = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    DateTime.fromISO(dateFrom).plus({ days: i }).toISODate()!
  );

  return (
    <main className="mx-auto w-full max-w-container flex-1 px-6 py-16">
      <p className="kicker mb-2">{eventType.durationMinutes} min</p>
      <h1 className="text-3xl font-semibold text-foreground">{eventType.name}</h1>
      {eventType.description && (
        <p className="mt-2 max-w-xl text-foreground-muted">{eventType.description}</p>
      )}

      {selectedSlot ? (
        <BookingForm
          slug={slug}
          slot={selectedSlot}
          bookerTimezone={bookerTimezone}
          eventTypeName={eventType.name}
          rescheduleToken={rescheduleToken}
          onBack={() => setSelectedSlot(null)}
          onBooked={(cancelToken) => setConfirmation({ cancelToken })}
        />
      ) : (
        <div className="mt-8">
          <div className="mb-4 flex items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
            >
              ← Settimana prec.
            </Button>
            <span className="tech-label">
              {DateTime.fromISO(dateFrom).toFormat("d MMM")} –{" "}
              {DateTime.fromISO(dateTo).toFormat("d MMM")}
            </span>
            <Button variant="secondary" onClick={() => setWeekOffset((w) => w + 1)}>
              Settimana succ. →
            </Button>
          </div>

          {slots === undefined ? (
            <p className="text-foreground-muted">Caricamento slot…</p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {daysInWindow.map((day) => {
                const daySlots = slotsByDay.get(day) ?? [];
                return (
                  <div key={day} className="border border-border bg-surface p-4">
                    <p className="tech-label mb-3">
                      {DateTime.fromISO(day).toFormat("cccc d MMMM")}
                    </p>
                    {daySlots.length === 0 ? (
                      <p className="text-sm text-foreground-muted">Nessuno slot disponibile</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            className="border border-border px-3 py-1.5 text-sm text-foreground hover:border-accent hover:text-accent"
                            onClick={() => setSelectedSlot(slot)}
                          >
                            {DateTime.fromMillis(slot.startTime, {
                              zone: bookerTimezone,
                            }).toFormat("HH:mm")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function BookingForm({
  slug,
  slot,
  bookerTimezone,
  eventTypeName,
  rescheduleToken,
  onBack,
  onBooked,
}: {
  slug: string;
  slot: { startTime: number; endTime: number };
  bookerTimezone: string;
  eventTypeName: string;
  rescheduleToken: string | null;
  onBack: () => void;
  onBooked: (cancelToken: string) => void;
}) {
  const createBooking = useMutation(api.bookings.create);
  const rescheduleBooking = useMutation(api.bookings.reschedule);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mt-8 max-w-md">
      <button onClick={onBack} className="link-ghost mb-6 text-sm">
        ← Cambia orario
      </button>
      <p className="tech-label mb-1">{eventTypeName}</p>
      <p className="mb-6 text-lg text-foreground">
        {DateTime.fromMillis(slot.startTime, { zone: bookerTimezone }).toFormat(
          "cccc d MMMM yyyy, HH:mm"
        )}
      </p>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setSubmitting(true);
          const submission = rescheduleToken
            ? rescheduleBooking({
                cancelToken: rescheduleToken,
                newStartTime: slot.startTime,
              })
            : createBooking({
                eventTypeSlug: slug,
                startTime: slot.startTime,
                inviteeName: name,
                inviteeEmail: email,
                inviteeTimezone: bookerTimezone,
                notes: notes || undefined,
              });
          submission
            .then((result) => onBooked(result.cancelToken))
            .catch(() => setError("Questo slot non è più disponibile. Scegline un altro."))
            .finally(() => setSubmitting(false));
        }}
      >
        {!rescheduleToken && (
          <>
            <input
              className="input-core829"
              placeholder="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="input-core829"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <textarea
              className="input-core829"
              placeholder="Note (opzionale)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </>
        )}
        {error && <p className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {rescheduleToken ? "Conferma nuovo orario" : "Conferma prenotazione"}
        </Button>
      </form>
    </div>
  );
}
