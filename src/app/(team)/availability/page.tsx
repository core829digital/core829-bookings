"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Button } from "@/components/ui/Button";

// weekday uses the JS/getDay convention shared with convex/schema.ts:
// 0 = Sunday .. 6 = Saturday (matches slotEngine's `cursor.weekday % 7`).
const WEEKDAYS = [
  { weekday: 0, label: "Domenica" },
  { weekday: 1, label: "Lunedì" },
  { weekday: 2, label: "Martedì" },
  { weekday: 3, label: "Mercoledì" },
  { weekday: 4, label: "Giovedì" },
  { weekday: 5, label: "Venerdì" },
  { weekday: 6, label: "Sabato" },
];

interface DayRow {
  weekday: number;
  start: string;
  end: string;
  enabled: boolean;
}

const ROW: DayRow = {
  weekday: 0,
  start: "09:00",
  end: "17:00",
  enabled: false,
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return Math.max(0, h * 60 + m);
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export default function AvailabilityPage() {
  const currentUser = useQuery(api.users.current);
  const rules = useQuery(api.availability.listMyRules);
  const exceptions = useQuery(api.availability.listMyExceptions);
  const setWeeklyRules = useMutation(api.availability.setMyWeeklyRules);
  const setException = useMutation(api.availability.setMyExceptionForDate);
  const removeException = useMutation(api.availability.removeMyExceptionForDate);

  const [rows, setRows] = useState<DayRow[]>(() =>
    WEEKDAYS.map((d) => ({ ...ROW, weekday: d.weekday }))
  );
  const [prevRules, setPrevRules] = useState<typeof rules>(rules);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Exceptions form state.
  const [excDate, setExcDate] = useState("");
  const [excType, setExcType] = useState<"unavailable" | "custom_hours">("unavailable");
  const [excStart, setExcStart] = useState("09:00");
  const [excEnd, setExcEnd] = useState("17:00");
  const [excError, setExcError] = useState<string | null>(null);

  // Populate the editor from the DB once the rules arrive, preserving any
  // in-progress edits afterward (adjusting-during-render, not an effect).
  if (prevRules !== rules) {
    setPrevRules(rules);
    if (rules !== undefined) {
      const byWeekday = new Map(rules.map((r) => [r.weekday, r]));
      setRows(
        WEEKDAYS.map((d) => {
          const r = byWeekday.get(d.weekday);
          return r
            ? {
                weekday: d.weekday,
                start: toHHMM(r.startMinute),
                end: toHHMM(r.endMinute),
                enabled: true,
              }
            : { ...ROW, weekday: d.weekday };
        })
      );
    }
  }

  function setRow(weekday: number, patch: Partial<DayRow>) {
    setRows((rs) => rs.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  }

  const sortedExceptions = [...(exceptions ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Disponibilità</h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Fuso orario: {currentUser?.timezone ?? "—"} · gli orari sono nel tuo fuso.
          </p>
        </div>
      </div>

      <section className="mt-8 border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Orario settimanale</h2>
          {saved && <span className="tech-label text-accent">Salvato</span>}
        </div>
        <div className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.weekday} className="flex items-center gap-4">
              <label className="w-28 text-sm text-foreground">{WEEKDAYS[row.weekday].label}</label>
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => setRow(row.weekday, { enabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              {row.enabled && (
                <>
                  <input
                    className="input-core829 max-w-[9rem]"
                    type="time"
                    value={row.start}
                    onChange={(e) => setRow(row.weekday, { start: e.target.value })}
                  />
                  <span className="text-foreground-muted">→</span>
                  <input
                    className="input-core829 max-w-[9rem]"
                    type="time"
                    value={row.end}
                    onChange={(e) => setRow(row.weekday, { end: e.target.value })}
                  />
                </>
              )}
            </div>
          ))}
        </div>
        <Button
          className="mt-6"
          disabled={saving}
          onClick={() => {
            setSaving(true);
            setSaved(false);
            const rules = rows
              .filter((r) => r.enabled)
              .filter((r) => r.start && r.end)
              .map((r) => ({ weekday: r.weekday, startMinute: toMinutes(r.start), endMinute: toMinutes(r.end) }))
              .filter((r) => r.endMinute > r.startMinute);
            setWeeklyRules({ rules })
              .then(() => setSaved(true))
              .finally(() => setSaving(false));
          }}
        >
          {saving ? "Salvataggio…" : "Salva orari"}
        </Button>
      </section>

      <section className="mt-10 border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-foreground">Eccezioni e blocchi</h2>
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            setExcError(null);
            if (!excDate) return;
            const isCustom = excType === "custom_hours";
            const startMinute = isCustom ? toMinutes(excStart) : undefined;
            const endMinute = isCustom ? toMinutes(excEnd) : undefined;
            if (isCustom && (!startMinute || !endMinute || endMinute <= startMinute)) {
              setExcError("Orario di fine deve essere dopo quello di inizio.");
              return;
            }
            setException({ date: excDate, type: excType, startMinute, endMinute })
              .then(() => setExcDate(""))
              .catch(() => setExcError("Impossibile salvare l'eccezione."));
          }}
        >
          <input
            className="input-core829"
            type="date"
            value={excDate}
            onChange={(e) => setExcDate(e.target.value)}
            required
          />
          <select
            className="input-core829"
            value={excType}
            onChange={(e) => setExcType(e.target.value as "unavailable" | "custom_hours")}
          >
            <option value="unavailable">Non disponibile (blocca giorno)</option>
            <option value="custom_hours">Orario personalizzato</option>
          </select>
          {excType === "custom_hours" && (
            <>
              <input
                className="input-core829"
                type="time"
                value={excStart}
                onChange={(e) => setExcStart(e.target.value)}
                required
              />
              <input
                className="input-core829"
                type="time"
                value={excEnd}
                onChange={(e) => setExcEnd(e.target.value)}
                required
              />
            </>
          )}
          {excError && <p className="text-sm text-accent sm:col-span-2">{excError}</p>}
          <Button type="submit" className="w-auto justify-self-start">
            Aggiungi eccezione
          </Button>
        </form>

        <div className="mt-6 space-y-2">
          {exceptions === undefined ? (
            <p className="text-foreground-muted">Caricamento…</p>
          ) : sortedExceptions.length === 0 ? (
            <p className="text-foreground-muted">Nessuna eccezione impostata.</p>
          ) : (
            sortedExceptions.map((exc) => (
              <div
                key={exc.date}
                className="flex items-center justify-between border border-border bg-background px-4 py-3"
              >
                <div>
                  <p className="text-foreground">{exc.date}</p>
                  <p className="text-sm text-foreground-muted">
                    {exc.type === "unavailable"
                      ? "Non disponibile"
                      : `Orario ${toHHMM(exc.startMinute ?? 0)} – ${toHHMM(exc.endMinute ?? 0)}`}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => void removeException({ date: exc.date })}
                >
                  Rimuovi
                </Button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}