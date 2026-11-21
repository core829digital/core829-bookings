import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import GlassLayer from "@/components/ui/GlassLayer";
import "./globals.css";

// Stack tipografico: "Saans" se installato sul dispositivo, altrimenti Inter self-hosted da next/font
// (subset latino, latino esteso, cirillico, greco: il sito è in 24 lingue), più JetBrains Mono per i
// dettagli tecnici. Michroma/DM Sans (brand) valutati e scartati: non coprono cirillico e greco.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext", "cyrillic", "greek"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
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
      <html lang="it" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
        <body className="min-h-full flex flex-col">
          <ConvexClientProvider>
            <LocaleProvider>{children}</LocaleProvider>
            <GlassLayer />
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
