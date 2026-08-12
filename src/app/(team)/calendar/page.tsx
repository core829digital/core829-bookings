"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

const GRID_START_HOUR = 9;
const GRID_END_HOUR = 18;
const SLOT_MINUTES = 30;
const ROWS = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES; // 18
const ROW_HEIGHT_REM = 2.75;

type Booking = Doc<"bookings">;

export default function CalendarPage() {
  const currentUser = useQuery(api.users.current);
  const timezone = currentUser?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = useMemo(
    () => DateTime.now().setZone(timezone).startOf("week").plus({ weeks: weekOffset }),
    [timezone, weekOffset]
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => weekStart.plus({ days: i })),
    [weekStart]
  );

  const fromTime = weekStart.toMillis();
  const toTime = weekStart.plus({ weeks: 1 }).toMillis();
  const bookings = useQuery(api.bookings.listMineForRange, { fromTime, toTime });
  const cancelAsHost = useMutation(api.bookings.cancelAsHost);

  const [quickCreate, setQuickCreate] = useState<DateTime | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const confirmedBookings = (bookings ?? []).filter((b) => b.status === "confirmed");

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Calendario</h1>
        <div className="flex items-center gap-3">
          <Button variant="secondary" onClick={() => setWeekOffset((w) => w - 1)}>
            ←
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset(0)}>
            Oggi
          </Button>
          <Button variant="secondary" onClick={() => setWeekOffset((w) => w + 1)}>
            →
          </Button>
          <span className="tech-label">
            {weekStart.toFormat("d MMM")} – {weekStart.plus({ days: 6 }).toFormat("d MMM")}
          </span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto border border-border">
        <div
          className="grid min-w-[900px]"
          style={{
            gridTemplateColumns: `4.5rem repeat(7, 1fr)`,
            gridTemplateRows: `2.5rem repeat(${ROWS}, ${ROW_HEIGHT_REM}rem)`,
          }}
        >
          {/* corner */}
          <div className="border-b border-r border-border" style={{ gridColumn: 1, gridRow: 1 }} />

          {/* day headers */}
          {days.map((day, i) => (
            <div
              key={day.toISODate()}
              className={`border-b border-r border-border p-2 text-center ${
                day.hasSame(DateTime.now().setZone(timezone), "day") ? "bg-surface" : ""
              }`}
              style={{ gridColumn: i + 2, gridRow: 1 }}
            >
              <p className="tech-label">{day.toFormat("ccc")}</p>
              <p className="text-sm text-foreground">{day.toFormat("d")}</p>
            </div>
          ))}

          {/* time labels */}
          {Array.from({ length: ROWS }, (_, i) => {
            const minutes = GRID_START_HOUR * 60 + i * SLOT_MINUTES;
            const label = DateTime.fromObject({ hour: 0 }).plus({ minutes }).toFormat("HH:mm");
            return (
              <div
                key={i}
                className="border-r border-t border-border px-2 pt-1 text-right"
                style={{ gridColumn: 1, gridRow: i + 2 }}
              >
                <span className="tech-label">{label}</span>
              </div>
            );
          })}

          {/* empty clickable cells (click to quick-create) */}
          {days.map((day, dayIdx) =>
            Array.from({ length: ROWS }, (_, rowIdx) => (
              <button
                key={`${dayIdx}-${rowIdx}`}
                type="button"
                className="border-r border-t border-border hover:bg-surface"
                style={{ gridColumn: dayIdx + 2, gridRow: rowIdx + 2 }}
                onClick={() =>
                  setQuickCreate(
                    day.set({
                      hour: GRID_START_HOUR + Math.floor((rowIdx * SLOT_MINUTES) / 60),
                      minute: (rowIdx * SLOT_MINUTES) % 60,
                    })
                  )
                }
              />
            ))
          )}

          {/* booking blocks */}
          {confirmedBookings.map((booking) => {
            const start = DateTime.fromMillis(booking.startTime, { zone: timezone });
            const end = DateTime.fromMillis(booking.endTime, { zone: timezone });
            const dayIdx = days.findIndex((d) => d.hasSame(start, "day"));
            if (dayIdx === -1) return null;
            const rowStart =
              ((start.hour * 60 + start.minute - GRID_START_HOUR * 60) / SLOT_MINUTES) + 2;
            const span = Math.max(1, (end.diff(start, "minutes").minutes) / SLOT_MINUTES);
            if (rowStart < 2 || rowStart >= ROWS + 2) return null;

            return (
              <button
                key={booking._id}
                type="button"
                onClick={() => setSelectedBooking(booking)}
                className="z-10 m-px overflow-hidden border border-accent/40 bg-accent/10 p-1.5 text-left hover:border-accent"
                style={{
                  gridColumn: dayIdx + 2,
                  gridRow: `${rowStart} / span ${span}`,
                }}
              >
                <p className="truncate text-xs font-medium text-accent">
                  {start.toFormat("HH:mm")} {booking.inviteeName}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {quickCreate && (
        <NewBookingModal initialDateTime={quickCreate} onClose={() => setQuickCreate(null)} />
      )}

      {selectedBooking && (
        <BookingDetailModal
          booking={selectedBooking}
          timezone={timezone}
          onClose={() => setSelectedBooking(null)}
          onCancel={() => {
            cancelAsHost({ bookingId: selectedBooking._id });
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 px-4">
      <div className="w-full max-w-md border border-border bg-background p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button onClick={onClose} className="text-foreground-muted hover:text-foreground">
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function BookingDetailModal({
  booking,
  timezone,
  onClose,
  onCancel,
}: {
  booking: Booking;
  timezone: string;
  onClose: () => void;
  onCancel: () => void;
}) {
  return (
    <ModalShell title="Prenotazione" onClose={onClose}>
      <p className="text-foreground">
        {DateTime.fromMillis(booking.startTime, { zone: timezone }).toFormat(
          "cccc d MMMM yyyy, HH:mm"
        )}
      </p>
      <p className="mt-1 text-sm text-foreground-muted">
        {booking.inviteeName} · {booking.inviteeEmail}
      </p>
      {booking.notes && <p className="mt-2 text-sm text-foreground-muted">{booking.notes}</p>}
      <Button variant="secondary" className="mt-6" onClick={onCancel}>
        Cancella prenotazione
      </Button>
    </ModalShell>
  );
}

function NewBookingModal({
  initialDateTime,
  onClose,
}: {
  initialDateTime: DateTime;
  onClose: () => void;
}) {
  const eventTypes = useQuery(api.eventTypes.listMine);
  const createManual = useMutation(api.bookings.createManual);
  const [eventTypeId, setEventTypeId] = useState<Id<"eventTypes"> | "">("");
  const [dateTime, setDateTime] = useState(initialDateTime.toFormat("yyyy-MM-dd'T'HH:mm"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <ModalShell title="Nuova prenotazione" onClose={onClose}>
      <form
        className="grid gap-3"
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
            .then(() => onClose())
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
          className="input-core829"
          placeholder="Note (opzionale)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
        {error && <p className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={submitting}>
          Crea prenotazione
        </Button>
      </form>
    </ModalShell>
  );
}
