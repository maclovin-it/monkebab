import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConsentBanner from "@/components/ConsentBanner";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mon Kebab",
  description: "Crée ta commande de kebab en ligne !",
  icons: {
    icon: "/icon.png",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Owns GA4 script loading (only once consent is granted) and the
            consent banner/reopen control — see components/ConsentBanner.tsx. */}
        <ConsentBanner />
        {children}
        {/* Discreet "Contact" link, present on every page — see
            components/Footer.tsx for why it's a fixed corner tab rather
            than a traditional in-flow footer. */}
        <Footer />
      </body>
    </html>
  );
}
