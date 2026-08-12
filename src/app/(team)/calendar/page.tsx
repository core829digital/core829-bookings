"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

export default function CalendarPage() {
  const [now] = useState(() => Date.now());
  const fromTime = now - 24 * 60 * 60_000;
  const toTime = now + 30 * 24 * 60 * 60_000;
  const bookings = useQuery(api.bookings.listMineForRange, { fromTime, toTime });
  const cancelAsHost = useMutation(api.bookings.cancelAsHost);
  const [showNewBooking, setShowNewBooking] = useState(false);

  const upcoming = (bookings ?? [])
    .filter((b) => b.status === "confirmed")
    .sort((a, b) => a.startTime - b.startTime);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Calendario</h1>
        <Button onClick={() => setShowNewBooking((s) => !s)}>
          {showNewBooking ? "Chiudi" : "+ Nuova prenotazione"}
        </Button>
      </div>

      {showNewBooking && (
        <div className="mt-6 border border-border bg-surface p-6">
          <NewManualBooking onDone={() => setShowNewBooking(false)} />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {bookings === undefined ? (
          <p className="text-foreground-muted">Caricamento…</p>
        ) : upcoming.length === 0 ? (
          <p className="text-foreground-muted">Nessuna prenotazione in programma.</p>
        ) : (
          upcoming.map((booking) => (
            <div
              key={booking._id}
              className="flex items-center justify-between border border-border p-4"
            >
              <div>
                <p className="text-foreground">
                  {DateTime.fromMillis(booking.startTime, {
                    zone: booking.inviteeTimezone,
                  }).toFormat("cccc d MMMM yyyy, HH:mm")}
                </p>
                <p className="text-sm text-foreground-muted">
                  {booking.inviteeName} · {booking.inviteeEmail}
                </p>
                {booking.notes && (
                  <p className="mt-1 text-sm text-foreground-muted">{booking.notes}</p>
                )}
              </div>
              <Button
                variant="secondary"
                onClick={() => cancelAsHost({ bookingId: booking._id })}
              >
                Cancella
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function NewManualBooking({ onDone }: { onDone: () => void }) {
  const eventTypes = useQuery(api.eventTypes.listMine);
  const createManual = useMutation(api.bookings.createManual);
  const [eventTypeId, setEventTypeId] = useState<Id<"eventTypes"> | "">("");
  const [dateTime, setDateTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!eventTypeId || !dateTime) return;
        setError(null);
        setSubmitting(true);
        const startTime = DateTime.fromISO(dateTime).toMillis();
        const inviteeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        createManual({
          eventTypeId,
          startTime,
          inviteeName: name,
          inviteeEmail: email,
          inviteeTimezone,
          notes: notes || undefined,
        })
          .then(() => onDone())
          .catch(() => setError("Impossibile creare la prenotazione (slot occupato?)."))
          .finally(() => setSubmitting(false));
      }}
    >
      <select
        className="input-core829"
        value={eventTypeId}
        onChange={(e) => setEventTypeId(e.target.value as Id<"eventTypes">)}
        required
      >
        <option value="">Tipo di appuntamento…</option>
        {(eventTypes ?? []).map((et) => (
          <option key={et._id} value={et._id}>
            {et.name}
          </option>
        ))}
      </select>
      <input
        className="input-core829"
        type="datetime-local"
        value={dateTime}
        onChange={(e) => setDateTime(e.target.value)}
        required
      />
      <input
        className="input-core829"
        placeholder="Nome invitato"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        className="input-core829"
        type="email"
        placeholder="Email invitato"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <textarea
        className="input-core829 sm:col-span-2"
        placeholder="Note (opzionale)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      {error && <p className="text-sm text-accent sm:col-span-2">{error}</p>}
      <Button type="submit" disabled={submitting} className="sm:col-span-2">
        Crea prenotazione
      </Button>
    </form>
  );
}
