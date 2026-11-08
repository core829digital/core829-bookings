#!/usr/bin/env node
// Verifica che il font sia lo STESSO in tutto il prodotto: nessuna famiglia scritta a mano fuori dal punto unico.
// Uso: npm run check:fonts   (esce con errore se trova una famiglia di font non ammessa)
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOTS = ["src", "app", "convex", "components"].filter((d) => { try { return statSync(d).isDirectory(); } catch { return false; } });
const IGNORE = new Set(["node_modules", ".next", "_generated", "messages"]);
// Famiglie ammesse: lo stack del brand (token o nomi del brand) e i generici di sistema come ultimo ripiego.
const ALLOWED = /^(\$\{[A-Z_]+\}?|var\(--font-[a-z-]+\)|inherit|"?Saans( Text| Display)?"?|'Saans( Text| Display)?'|Inter|"?JetBrains Mono"?|ui-sans-serif|ui-monospace|system-ui|-apple-system|BlinkMacSystemFont|"?Segoe UI"?|'Segoe UI'|Roboto|Arial|Helvetica|sans-serif|monospace|SFMono-Regular)$/i;
const ALLOWED_FILES = [/globals\.css$/, /tailwind\.config\.(ts|js)$/, /layout\.tsx$/];

const problems = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(css|tsx?|html)$/.test(name) && !/\.test\./.test(name)) scan(p);
  }
}
function scan(file) {
  const text = readFileSync(file, "utf8");
  const re = /font-?family\s*[:=]\s*(?:\{\s*)?["'`]?([^;"`}\n]+?)["'`]?\s*(?:;|\}|\n|$)/gi;
  for (const m of text.matchAll(re)) {
    const parts = m[1].split(",").map((s) => s.trim()).filter(Boolean);
    const bad = parts.filter((s) => !ALLOWED.test(s) && !ALLOWED.test(s.replace(/^["']|["']$/g, "")));
    if (bad.length && !ALLOWED_FILES.some((r) => r.test(file))) {
      problems.push(`${relative(".", file)}: famiglia non ammessa «${bad.join(", ")}»`);
    }
  }
  // Classi Tailwind con un font a scelta libera (es. font-['Arial']) o serif.
  for (const m of text.matchAll(/\bfont-\[(?!\d|var\()[^\]]+\]|\bfont-serif\b/g)) problems.push(`${relative(".", file)}: classe di font fuori dal brand «${m[0]}»`);
}
for (const r of ROOTS) walk(r);
if (problems.length) {
  console.error("Font non uniformi:\n- " + [...new Set(problems)].join("\n- "));
  process.exit(1);
}
console.log("Font OK: nessuna famiglia fuori dallo stack del brand (Saans → Inter, JetBrains Mono per i dettagli tecnici).");
