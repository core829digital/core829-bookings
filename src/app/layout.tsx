import type { Metadata, Viewport } from "next";
import { DM_Sans, Michroma } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import "./globals.css";

// Tipografia del brand CORE829 (Brand Guidelines 1.0): Michroma per titoli ed etichette, DM Sans per testi e
// interfacce. Self-hosted da next/font; i token --font-* sono in globals.css.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

const title = "CORE829 Bookings — Prenota un appuntamento online";
const description =
  "Prenota online un appuntamento con CORE829: calendario in tempo reale, promemoria automatici, widget e API per il tuo sito.";

export const viewport: Viewport = {
  themeColor: "#f8f8f8",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://bookings.core829.net"),
  title: { default: title, template: "%s | CORE829 Bookings" },
  description,
  openGraph: {
    title,
    description,
    url: "https://bookings.core829.net",
    siteName: "CORE829 Bookings",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ConvexAuthNextjsServerProvider>
      <html lang="it" className={`${dmSans.variable} ${michroma.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <LocaleProvider>{children}</LocaleProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
