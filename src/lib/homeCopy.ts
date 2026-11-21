import type { Locale } from "@/lib/i18n/translations";

/**
 * Testi della home pubblica (senza prezzi: per un'offerta dedicata si scrive o si chiama il team).
 * Tradotti in it, en, ro, fr, de, es; le altre lingue ricadono sull'inglese, come per i testi lunghi
 * del sito (vedi translations.ts).
 */
export interface HomeCopy {
  navHow: string;
  navSite: string;
  navContact: string;
  book: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBook: string;
  heroEmail: string;
  tryKicker: string;
  tryTitle: string;
  tryBody: string;
  whyKicker: string;
  whyTitle: string;
  props: { t: string; d: string }[];
  howKicker: string;
  howTitle: string;
  steps: { t: string; d: string }[];
  siteKicker: string;
  siteTitle: string;
  siteBody: string;
  siteCards: { t: string; d: string }[];
  snippetLabel: string;
  ctaKicker: string;
  ctaTitle: string;
  ctaBody: string;
  ctaEmail: string;
  ctaCall: string;
  emailSubject: string;
  reviews: string;
}

const en: HomeCopy = {
  navHow: "How it works",
  navSite: "For your website",
  navContact: "Contact",
  book: "Book a call",
  heroKicker: "CORE829 Bookings",
  heroTitle: "Online bookings, made simple.",
  heroSubtitle:
    "The booking system built by CORE829: a real-time calendar, automatic reminders and a widget ready for your website.",
  heroBook: "Book a call",
  heroEmail: "Write to the team",
  tryKicker: "Try it now",
  tryTitle: "This is the real calendar, live",
  tryBody:
    "No fake demo: pick a time below and you get exactly the experience a customer would have on your website.",
  whyKicker: "Why it works",
  whyTitle: "Built so nobody loses time or customers",
  props: [
    { t: "Zero double bookings", d: "Every booking is checked in real time against the team calendar: two people can never take the same slot, even when clicking at the same instant." },
    { t: "Time zones handled for you", d: "Visitors always see times in their own time zone; your team works in theirs. Daylight-saving changes are accounted for, with no ghost slots." },
    { t: "Automatic confirmations and emails", d: "Instant email confirmation, reminders 24 hours and 1 hour before, and a direct link to cancel or reschedule without an account." },
    { t: "A widget for your website", d: "The same calendar you see here embeds in any site with one line of code, or connects through the API with webhooks for every booking." },
  ],
  howKicker: "How it works",
  howTitle: "From the click to the meeting, in four steps",
  steps: [
    { t: "Pick a time", d: "Choose a free slot in your own time zone." },
    { t: "Confirm", d: "Enter your details and receive the confirmation by email." },
    { t: "Get reminded", d: "Automatic reminders arrive 24 hours and 1 hour before." },
    { t: "Change your mind?", d: "Cancel or reschedule with one link, no account needed." },
  ],
  siteKicker: "For your website",
  siteTitle: "The same system, on your own website",
  siteBody:
    "We build booking systems for companies: a hosted booking page, a widget in your colours and font, or an API with webhooks. Tell us what you need and we reply with a tailored proposal.",
  siteCards: [
    { t: "Embeddable widget", d: "One line of code, your colours, your font and your language." },
    { t: "API and webhooks", d: "Connect bookings to your CRM, your mailbox or your team chat." },
    { t: "Hosted booking page", d: "A ready page with your brand, no website changes needed." },
  ],
  snippetLabel: "Example: embed the widget",
  ctaKicker: "Contact",
  ctaTitle: "Want a booking system for your company?",
  ctaBody: "Write to us or call: we reply with a clear proposal for your case.",
  ctaEmail: "Write to the team",
  ctaCall: "Call",
  emailSubject: "Booking system request",
  reviews: "Read the reviews on Trustpilot",
};

export const HOME_COPY: Partial<Record<Locale, HomeCopy>> = {
  en,
  it: {
    navHow: "Come funziona",
    navSite: "Per il tuo sito",
    navContact: "Contatti",
    book: "Prenota una call",
    heroKicker: "CORE829 Bookings",
    heroTitle: "Prenotazioni online, senza complicazioni.",
    heroSubtitle:
      "Il sistema di prenotazione costruito da CORE829: calendario in tempo reale, promemoria automatici e un widget pronto per il tuo sito.",
    heroBook: "Prenota una call",
    heroEmail: "Scrivi al team",
    tryKicker: "Provalo subito",
    tryTitle: "Questo è il calendario vero, in tempo reale",
    tryBody:
      "Nessuna demo finta: scegli un orario qui sotto ed è la stessa identica esperienza che avrebbe un cliente sul tuo sito.",
    whyKicker: "Perché funziona",
    whyTitle: "Costruito per non far perdere né tempo né clienti",
    props: [
      { t: "Zero doppie prenotazioni", d: "Ogni prenotazione viene verificata in tempo reale contro il calendario del team: due persone non potranno mai occupare lo stesso slot, nemmeno cliccando nello stesso istante." },
      { t: "Fusi orari gestiti per te", d: "Chi prenota vede sempre l'orario nel proprio fuso; il tuo team lavora nel suo. Il calcolo tiene conto anche dei cambi d'ora legale, senza slot fantasma." },
      { t: "Conferme ed email automatiche", d: "Conferma via email immediata, promemoria a 24 ore e a 1 ora dall'appuntamento e link diretto per cancellare o riprogrammare senza bisogno di un account." },
      { t: "Widget per il tuo sito", d: "Lo stesso calendario che vedi qui si integra in qualsiasi sito con una riga di codice, oppure via API con notifiche webhook per ogni prenotazione." },
    ],
    howKicker: "Come funziona",
    howTitle: "Dal clic all'incontro, in quattro passi",
    steps: [
      { t: "Scegli l'orario", d: "Seleziona uno slot libero nel tuo fuso orario." },
      { t: "Conferma", d: "Inserisci i tuoi dati e ricevi la conferma via email." },
      { t: "Ricevi il promemoria", d: "Promemoria automatici a 24 ore e a 1 ora dall'appuntamento." },
      { t: "Hai cambiato idea?", d: "Cancella o riprogramma con un link, senza account." },
    ],
    siteKicker: "Per il tuo sito",
    siteTitle: "Lo stesso sistema, sul tuo sito",
    siteBody:
      "Realizziamo sistemi di prenotazione per le aziende: una pagina di prenotazione ospitata, un widget con i tuoi colori e il tuo font oppure un'API con webhook. Raccontaci cosa ti serve e ti rispondiamo con una proposta su misura.",
    siteCards: [
      { t: "Widget incorporabile", d: "Una riga di codice, i tuoi colori, il tuo font e la tua lingua." },
      { t: "API e webhook", d: "Collega le prenotazioni al tuo CRM, alla tua casella o alla chat del team." },
      { t: "Pagina di prenotazione", d: "Una pagina pronta con il tuo marchio, senza toccare il tuo sito." },
    ],
    snippetLabel: "Esempio: incorpora il widget",
    ctaKicker: "Contatti",
    ctaTitle: "Vuoi un sistema di prenotazione per la tua azienda?",
    ctaBody: "Scrivici o chiamaci: ti rispondiamo con una proposta chiara per il tuo caso.",
    ctaEmail: "Scrivi al team",
    ctaCall: "Chiama",
    emailSubject: "Richiesta sistema di prenotazione",
    reviews: "Leggi le recensioni su Trustpilot",
  },
  ro: {
    navHow: "Cum funcționează",
    navSite: "Pentru site-ul tău",
    navContact: "Contact",
    book: "Programează un apel",
    heroKicker: "CORE829 Bookings",
    heroTitle: "Programări online, fără complicații.",
    heroSubtitle:
      "Sistemul de programări creat de CORE829: calendar în timp real, remindere automate și un widget gata pentru site-ul tău.",
    heroBook: "Programează un apel",
    heroEmail: "Scrie echipei",
    tryKicker: "Încearcă acum",
    tryTitle: "Acesta este calendarul real, în timp real",
    tryBody:
      "Fără demo fals: alege o oră mai jos și vezi exact experiența pe care o are un client pe site-ul tău.",
    whyKicker: "De ce funcționează",
    whyTitle: "Construit ca să nu pierzi nici timp, nici clienți",
    props: [
      { t: "Zero dublări", d: "Fiecare programare este verificată în timp real față de calendarul echipei: două persoane nu pot ocupa niciodată același interval." },
      { t: "Fusuri orare gestionate pentru tine", d: "Vizitatorii văd mereu ora în fusul lor, iar echipa lucrează în al ei. Schimbarea orei de vară/iarnă este luată în calcul." },
      { t: "Confirmări și e-mailuri automate", d: "Confirmare imediată prin e-mail, remindere cu 24 de ore și cu 1 oră înainte, plus un link pentru anulare sau reprogramare fără cont." },
      { t: "Widget pentru site-ul tău", d: "Același calendar se integrează în orice site cu o singură linie de cod sau prin API, cu notificări webhook pentru fiecare programare." },
    ],
    howKicker: "Cum funcționează",
    howTitle: "De la clic la întâlnire, în patru pași",
    steps: [
      { t: "Alege ora", d: "Selectează un interval liber în fusul tău orar." },
      { t: "Confirmă", d: "Introdu datele și primești confirmarea prin e-mail." },
      { t: "Primești reminder", d: "Remindere automate cu 24 de ore și cu 1 oră înainte." },
      { t: "Te-ai răzgândit?", d: "Anulează sau reprogramează cu un link, fără cont." },
    ],
    siteKicker: "Pentru site-ul tău",
    siteTitle: "Același sistem, pe site-ul tău",
    siteBody:
      "Realizăm sisteme de programări pentru companii: o pagină de programare găzduită, un widget în culorile și fontul tău sau un API cu webhook-uri. Spune-ne ce ai nevoie și îți răspundem cu o propunere personalizată.",
    siteCards: [
      { t: "Widget integrabil", d: "O linie de cod, culorile, fontul și limba ta." },
      { t: "API și webhook-uri", d: "Conectează programările la CRM, la e-mail sau la chatul echipei." },
      { t: "Pagină de programare", d: "O pagină gata, cu marca ta, fără modificări pe site." },
    ],
    snippetLabel: "Exemplu: integrează widgetul",
    ctaKicker: "Contact",
    ctaTitle: "Vrei un sistem de programări pentru compania ta?",
    ctaBody: "Scrie-ne sau sună-ne: îți răspundem cu o propunere clară pentru cazul tău.",
    ctaEmail: "Scrie echipei",
    ctaCall: "Sună",
    emailSubject: "Cerere sistem de programări",
    reviews: "Citește recenziile pe Trustpilot",
  },
  fr: {
    navHow: "Comment ça marche",
    navSite: "Pour votre site",
    navContact: "Contact",
    book: "Réserver un appel",
    heroKicker: "CORE829 Bookings",
    heroTitle: "Réservations en ligne, sans complications.",
    heroSubtitle:
      "Le système de réservation conçu par CORE829 : calendrier en temps réel, rappels automatiques et un widget prêt pour votre site.",
    heroBook: "Réserver un appel",
    heroEmail: "Écrire à l'équipe",
    tryKicker: "Essayez maintenant",
    tryTitle: "Voici le vrai calendrier, en temps réel",
    tryBody:
      "Pas de fausse démo : choisissez un horaire ci-dessous et vivez exactement l'expérience d'un client sur votre site.",
    whyKicker: "Pourquoi ça marche",
    whyTitle: "Conçu pour ne perdre ni temps ni clients",
    props: [
      { t: "Zéro double réservation", d: "Chaque réservation est vérifiée en temps réel avec le calendrier de l'équipe : deux personnes ne peuvent jamais prendre le même créneau." },
      { t: "Fuseaux horaires gérés pour vous", d: "Le visiteur voit toujours l'heure dans son fuseau ; votre équipe travaille dans le sien. Les changements d'heure sont pris en compte." },
      { t: "Confirmations et e-mails automatiques", d: "Confirmation immédiate par e-mail, rappels 24 heures et 1 heure avant, et lien direct pour annuler ou reporter sans compte." },
      { t: "Un widget pour votre site", d: "Le même calendrier s'intègre à n'importe quel site avec une ligne de code, ou via l'API avec des webhooks pour chaque réservation." },
    ],
    howKicker: "Comment ça marche",
    howTitle: "Du clic au rendez-vous, en quatre étapes",
    steps: [
      { t: "Choisissez l'horaire", d: "Sélectionnez un créneau libre dans votre fuseau horaire." },
      { t: "Confirmez", d: "Saisissez vos coordonnées et recevez la confirmation par e-mail." },
      { t: "Recevez un rappel", d: "Rappels automatiques 24 heures et 1 heure avant." },
      { t: "Un empêchement ?", d: "Annulez ou reportez avec un lien, sans compte." },
    ],
    siteKicker: "Pour votre site",
    siteTitle: "Le même système, sur votre site",
    siteBody:
      "Nous réalisons des systèmes de réservation pour les entreprises : une page de réservation hébergée, un widget à vos couleurs et à votre police, ou une API avec webhooks. Dites-nous ce qu'il vous faut et nous répondons avec une proposition sur mesure.",
    siteCards: [
      { t: "Widget intégrable", d: "Une ligne de code, vos couleurs, votre police et votre langue." },
      { t: "API et webhooks", d: "Reliez les réservations à votre CRM, votre messagerie ou le chat de l'équipe." },
      { t: "Page de réservation", d: "Une page prête à votre image, sans toucher à votre site." },
    ],
    snippetLabel: "Exemple : intégrer le widget",
    ctaKicker: "Contact",
    ctaTitle: "Un système de réservation pour votre entreprise ?",
    ctaBody: "Écrivez-nous ou appelez-nous : nous répondons avec une proposition claire pour votre cas.",
    ctaEmail: "Écrire à l'équipe",
    ctaCall: "Appeler",
    emailSubject: "Demande de système de réservation",
    reviews: "Lire les avis sur Trustpilot",
  },
  de: {
    navHow: "So funktioniert's",
    navSite: "Für Ihre Website",
    navContact: "Kontakt",
    book: "Anruf buchen",
    heroKicker: "CORE829 Bookings",
    heroTitle: "Online-Buchungen, ganz einfach.",
    heroSubtitle:
      "Das von CORE829 entwickelte Buchungssystem: Echtzeit-Kalender, automatische Erinnerungen und ein Widget für Ihre Website.",
    heroBook: "Anruf buchen",
    heroEmail: "Dem Team schreiben",
    tryKicker: "Jetzt ausprobieren",
    tryTitle: "Das ist der echte Kalender, live",
    tryBody:
      "Keine Fake-Demo: Wählen Sie unten eine Zeit und erleben Sie genau das, was ein Kunde auf Ihrer Website erlebt.",
    whyKicker: "Warum es funktioniert",
    whyTitle: "Gebaut, damit weder Zeit noch Kunden verloren gehen",
    props: [
      { t: "Keine Doppelbuchungen", d: "Jede Buchung wird in Echtzeit gegen den Teamkalender geprüft: Zwei Personen können nie denselben Termin belegen." },
      { t: "Zeitzonen übernehmen wir", d: "Besucher sehen die Zeit immer in ihrer Zeitzone, Ihr Team arbeitet in seiner. Zeitumstellungen sind berücksichtigt." },
      { t: "Automatische Bestätigungen und E-Mails", d: "Sofortige Bestätigung per E-Mail, Erinnerungen 24 Stunden und 1 Stunde vorher sowie ein Link zum Stornieren oder Verschieben ohne Konto." },
      { t: "Ein Widget für Ihre Website", d: "Derselbe Kalender lässt sich mit einer Zeile Code in jede Website einbetten oder per API mit Webhooks für jede Buchung anbinden." },
    ],
    howKicker: "So funktioniert's",
    howTitle: "Vom Klick zum Termin in vier Schritten",
    steps: [
      { t: "Zeit wählen", d: "Wählen Sie einen freien Termin in Ihrer Zeitzone." },
      { t: "Bestätigen", d: "Daten eingeben und die Bestätigung per E-Mail erhalten." },
      { t: "Erinnert werden", d: "Automatische Erinnerungen 24 Stunden und 1 Stunde vorher." },
      { t: "Umgeplant?", d: "Mit einem Link stornieren oder verschieben, ohne Konto." },
    ],
    siteKicker: "Für Ihre Website",
    siteTitle: "Dasselbe System auf Ihrer Website",
    siteBody:
      "Wir bauen Buchungssysteme für Unternehmen: eine gehostete Buchungsseite, ein Widget in Ihren Farben und Ihrer Schrift oder eine API mit Webhooks. Sagen Sie uns, was Sie brauchen, und wir antworten mit einem maßgeschneiderten Vorschlag.",
    siteCards: [
      { t: "Einbettbares Widget", d: "Eine Zeile Code, Ihre Farben, Ihre Schrift und Ihre Sprache." },
      { t: "API und Webhooks", d: "Buchungen mit CRM, Postfach oder Team-Chat verbinden." },
      { t: "Gehostete Buchungsseite", d: "Eine fertige Seite mit Ihrer Marke, ohne Änderungen an Ihrer Website." },
    ],
    snippetLabel: "Beispiel: Widget einbetten",
    ctaKicker: "Kontakt",
    ctaTitle: "Ein Buchungssystem für Ihr Unternehmen?",
    ctaBody: "Schreiben oder rufen Sie uns an: Wir antworten mit einem klaren Vorschlag für Ihren Fall.",
    ctaEmail: "Dem Team schreiben",
    ctaCall: "Anrufen",
    emailSubject: "Anfrage Buchungssystem",
    reviews: "Bewertungen auf Trustpilot lesen",
  },
  es: {
    navHow: "Cómo funciona",
    navSite: "Para tu web",
    navContact: "Contacto",
    book: "Reservar una llamada",
    heroKicker: "CORE829 Bookings",
    heroTitle: "Reservas online, sin complicaciones.",
    heroSubtitle:
      "El sistema de reservas creado por CORE829: calendario en tiempo real, recordatorios automáticos y un widget listo para tu web.",
    heroBook: "Reservar una llamada",
    heroEmail: "Escribir al equipo",
    tryKicker: "Pruébalo ahora",
    tryTitle: "Este es el calendario real, en tiempo real",
    tryBody:
      "Nada de demos falsas: elige una hora abajo y vive exactamente la experiencia de un cliente en tu web.",
    whyKicker: "Por qué funciona",
    whyTitle: "Creado para no perder ni tiempo ni clientes",
    props: [
      { t: "Cero reservas duplicadas", d: "Cada reserva se verifica en tiempo real con el calendario del equipo: dos personas nunca podrán ocupar el mismo hueco." },
      { t: "Zonas horarias gestionadas por ti", d: "Quien reserva ve siempre la hora en su zona; tu equipo trabaja en la suya. Los cambios de hora se tienen en cuenta." },
      { t: "Confirmaciones y emails automáticos", d: "Confirmación inmediata por email, recordatorios 24 horas y 1 hora antes, y un enlace para cancelar o reprogramar sin cuenta." },
      { t: "Un widget para tu web", d: "El mismo calendario se integra en cualquier web con una línea de código, o por API con webhooks para cada reserva." },
    ],
    howKicker: "Cómo funciona",
    howTitle: "Del clic a la reunión, en cuatro pasos",
    steps: [
      { t: "Elige la hora", d: "Selecciona un hueco libre en tu zona horaria." },
      { t: "Confirma", d: "Introduce tus datos y recibe la confirmación por email." },
      { t: "Recibe el recordatorio", d: "Recordatorios automáticos 24 horas y 1 hora antes." },
      { t: "¿Cambio de planes?", d: "Cancela o reprograma con un enlace, sin cuenta." },
    ],
    siteKicker: "Para tu web",
    siteTitle: "El mismo sistema, en tu web",
    siteBody:
      "Creamos sistemas de reservas para empresas: una página de reservas alojada, un widget con tus colores y tu fuente, o una API con webhooks. Cuéntanos qué necesitas y te respondemos con una propuesta a medida.",
    siteCards: [
      { t: "Widget integrable", d: "Una línea de código, tus colores, tu fuente y tu idioma." },
      { t: "API y webhooks", d: "Conecta las reservas con tu CRM, tu correo o el chat del equipo." },
      { t: "Página de reservas", d: "Una página lista con tu marca, sin tocar tu web." },
    ],
    snippetLabel: "Ejemplo: integra el widget",
    ctaKicker: "Contacto",
    ctaTitle: "¿Quieres un sistema de reservas para tu empresa?",
    ctaBody: "Escríbenos o llámanos: te respondemos con una propuesta clara para tu caso.",
    ctaEmail: "Escribir al equipo",
    ctaCall: "Llamar",
    emailSubject: "Solicitud de sistema de reservas",
    reviews: "Leer las opiniones en Trustpilot",
  },
};

export function homeCopy(locale: Locale): HomeCopy {
  return HOME_COPY[locale] ?? en;
}
