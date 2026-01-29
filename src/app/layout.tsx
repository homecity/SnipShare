import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: {
    default: "snipit.sh - Share Text & Code Snippets Securely",
    template: "%s | snipit.sh",
  },
  description: "Share text and code snippets securely with password protection, auto-expiration, and burn-after-reading features. No login required. Free and open source pastebin alternative.",
  keywords: ["paste", "pastebin", "code sharing", "text sharing", "snippet", "share code", "pastebin alternative", "secure paste", "code snippet", "burn after read"],
  openGraph: {
    title: "snipit.sh - Share Text & Code Snippets Securely",
    description: "Share text and code snippets securely with password protection, auto-expiration, and burn-after-reading. No login required.",
    type: "website",
    siteName: "snipit.sh",
    url: "https://snipit.sh",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "snipit.sh - Share Text & Code Snippets Securely",
    description: "Share text and code snippets securely. No login required.",
  },
  metadataBase: new URL("https://snipit.sh"),
  alternates: {
    canonical: "https://snipit.sh",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "snipit.sh",
  url: "https://snipit.sh",
  description: "Share text and code snippets securely with password protection, auto-expiration, and burn-after-reading features.",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Password-protected snippets",
    "Auto-expiration",
    "Burn after reading",
    "Syntax highlighting for 26+ languages",
    "QR code sharing",
    "No login required",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
