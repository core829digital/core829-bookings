"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { DateTime } from "luxon";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/Button";
import { CORE829_SERVICES } from "@/lib/services";
import { useTranslation } from "@/lib/i18n/LocaleProvider";

const WINDOW_DAYS = 7;

interface Slot {
  startTime: number;
  endTime: number;
}

export interface WidgetTheme {
  accent?: string; // any valid CSS color, e.g. "#e11d2e" — defaults to CORE829 red
  font?: string; // Google Fonts family name, e.g. "Inter" — loaded on demand
  showLogo?: boolean; // "Powered by CORE829" footer badge — default true
}

function useGoogleFont(font?: string) {
  useEffect(() => {
    if (!font) return;
    const id = `widget-font-${font.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}:wght@400;500;600&display=swap`;
    document.head.appendChild(link);
  }, [font]);
}

// The whole public booking flow (event type header, week-by-week slot
// picker, invitee form, confirmation) as one reusable widget — used by the
// full-page /book/[slug] route, the chrome-free /embed/[slug] route (for
// iframing into other sites, including core829.net), and the live preview
// on the CORE829 homepage. `compact` drops the outer page padding/max-width
// so it fits inside a card or an iframe instead of a full page. `theme`
// lets an embedder match its own brand (accent color, font) without any
// code beyond the iframe's query string — see /embed/[slug]/page.tsx.
export function BookingWidget({
  slug,
  rescheduleToken = null,
  compact = false,
  theme,
}: {
  slug: string;
  rescheduleToken?: string | null;
  compact?: boolean;
  theme?: WidgetTheme;
}) {
  useGoogleFont(theme?.font);
  const { t } = useTranslation();

  const eventType = useQuery(api.eventTypes.getBySlug, { slug });
  const bookerTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    []
  );
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [confirmation, setConfirmation] = useState<{ cancelToken: string } | null>(null);

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

  const wrapperClass = compact ? "" : "mx-auto w-full max-w-container flex-1 px-6 py-16";
  const themeStyle = {
    ...(theme?.accent ? { "--color-accent": theme.accent } : {}),
    ...(theme?.font ? { fontFamily: `"${theme.font}", var(--font-sans)` } : {}),
  } as React.CSSProperties;
  const showLogo = theme?.showLogo ?? true;

  if (eventType === undefined) {
    return (
      <div className={wrapperClass} style={themeStyle}>
        {t("widget_loading")}
      </div>
    );
  }
  if (eventType === null) {
    return (
      <div className={`${wrapperClass} text-foreground-muted`} style={themeStyle}>
        {t("widget_notFound")}
      </div>
    );
  }

  if (confirmation) {
    return (
      <div className={`${wrapperClass} text-center`} style={themeStyle}>
        <h2 className="text-2xl font-semibold text-foreground">{t("widget_confirmedTitle")}</h2>
        <p className="mt-2 text-foreground-muted">{t("widget_confirmedBody")}</p>
        <a
          href={`/bookings/${confirmation.cancelToken}`}
          target={compact ? "_blank" : undefined}
          rel={compact ? "noopener noreferrer" : undefined}
          className="link-ghost mt-6 inline-block"
        >
          {t("widget_manage")}
        </a>
        {showLogo && <WidgetBrandBadge />}
      </div>
    );
  }

  const slotsByDay = new Map<string, Slot[]>();
  for (const slot of slots ?? []) {
    const day = DateTime.fromMillis(slot.startTime, { zone: bookerTimezone }).toISODate()!;
    const list = slotsByDay.get(day) ?? [];
    list.push(slot);
    slotsByDay.set(day, list);
  }
  const daysInWindow = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    DateTime.fromISO(dateFrom).plus({ days: i }).toISODate()!
  );

  return (
    <div className={wrapperClass} style={themeStyle}>
      <p className="kicker mb-2">{eventType.durationMinutes} min</p>
      <h2 className={compact ? "text-xl font-semibold text-foreground" : "text-3xl font-semibold text-foreground"}>
        {eventType.name}
      </h2>
      {eventType.description && (
        <p className="mt-2 max-w-xl text-sm text-foreground-muted">{eventType.description}</p>
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
        <div className="mt-6">
          <div className="mb-4 flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
              disabled={weekOffset === 0}
            >
              ←
            </Button>
            <span className="tech-label">
              {DateTime.fromISO(dateFrom).toFormat("d MMM")} –{" "}
              {DateTime.fromISO(dateTo).toFormat("d MMM")}
            </span>
            <Button variant="secondary" onClick={() => setWeekOffset((w) => w + 1)}>
              →
            </Button>
          </div>

          {slots === undefined ? (
            <p className="text-foreground-muted">{t("widget_loadingSlots")}</p>
          ) : (
            <div className={compact ? "grid gap-4 sm:grid-cols-2" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
              {daysInWindow.map((day) => {
                const daySlots = slotsByDay.get(day) ?? [];
                return (
                  <div key={day} className="border border-border bg-surface p-3">
                    <p className="tech-label mb-2">
                      {DateTime.fromISO(day).toFormat("ccc d MMM")}
                    </p>
                    {daySlots.length === 0 ? (
                      <p className="text-xs text-foreground-muted">{t("widget_noSlots")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {daySlots.map((slot) => (
                          <button
                            key={slot.startTime}
                            className="border border-border px-2.5 py-1 text-xs text-foreground hover:border-accent hover:text-accent"
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
          {showLogo && <WidgetBrandBadge />}
        </div>
      )}
    </div>
  );
}

function WidgetBrandBadge() {
  const { t } = useTranslation();
  return (
    <a
      href="https://bookings.core829.net"
      target="_blank"
      rel="noopener noreferrer"
      className="mt-8 inline-flex items-center gap-2 text-xs text-foreground-muted hover:text-foreground"
    >
      <Image src="/core829branding/core829-logo.webp" alt="" width={16} height={16} />
      {t("widget_poweredBy")}
    </a>
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
  slot: Slot;
  bookerTimezone: string;
  eventTypeName: string;
  rescheduleToken: string | null;
  onBack: () => void;
  onBooked: (cancelToken: string) => void;
}) {
  const { t } = useTranslation();
  const createBooking = useMutation(api.bookings.create);
  const rescheduleBooking = useMutation(api.bookings.reschedule);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [service, setService] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mt-6 max-w-md">
      <button onClick={onBack} className="link-ghost mb-4 text-sm">
        {t("widget_changeTime")}
      </button>
      <p className="tech-label mb-1">{eventTypeName}</p>
      <p className="mb-4 text-foreground">
        {DateTime.fromMillis(slot.startTime, { zone: bookerTimezone }).toFormat(
          "cccc d MMMM yyyy, HH:mm"
        )}
      </p>
      <form
        className="space-y-3"
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
                service: service || undefined,
              });
          submission
            .then((result) => onBooked(result.cancelToken))
            .catch(() => setError(t("widget_slotGone")))
            .finally(() => setSubmitting(false));
        }}
      >
        {!rescheduleToken && (
          <>
            <input
              className="input-core829"
              placeholder={t("widget_name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="input-core829"
              type="email"
              placeholder={t("widget_email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select
              className="input-core829"
              value={service}
              onChange={(e) => setService(e.target.value)}
            >
              <option value="">{t("widget_servicePlaceholder")}</option>
              {CORE829_SERVICES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <textarea
              className="input-core829"
              placeholder={t("widget_notes")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </>
        )}
        {error && <p className="text-sm text-accent">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {rescheduleToken ? t("widget_confirmNewTime") : t("widget_confirmBooking")}
        </Button>
      </form>
    </div>
  );
}
