import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import "./globals.css";

// Stesso stack di Andromedia Web e di core829.net: "Saans" se installato sul dispositivo, altrimenti Inter
// self-hosted da next/font (font variabile: normale, bold e ogni peso intermedio), piu' JetBrains Mono per i
// dettagli tecnici. I token --font-* sono in globals.css.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const title = "CORE829 Bookings — Prenota un appuntamento online";
const description =
  "Il sistema di prenotazione di CORE829: calendario in tempo reale, promemoria automatici e API per integrare il booking in qualsiasi sito.";

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
      <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <LocaleProvider>{children}</LocaleProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
