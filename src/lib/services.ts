// Mirrors SERVICES_META in core829-new-final/lib/constants.ts — kept as a
// plain constant here (not shared code, separate repo) so the booking form
// can ask "which service is this call about" with the same taxonomy.
export const CORE829_SERVICES = [
  "Server Personalizzati",
  "Automazioni B2B",
  "Creazione WebDesign",
  "Creazione WebApp",
  "Creazione Software Eseguibili",
  "Indicizzazione SEO",
  "Marketing a 360 Gradi (Organico e Paid)",
  "Altro",
] as const;
