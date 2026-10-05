import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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

// Only loaded when both conditions hold: a measurement id is configured,
// and this is a real production build — keeps local dev / preview / test
// runs out of GA4 entirely, no env juggling required to avoid polluting data.
const GA_MEASUREMENT_ID =
  process.env.NODE_ENV === "production" ? process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID : undefined;

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
      <head>
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
          </>
        )}
      </head>

      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}