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
    default: "SnipShare - Share Text & Code Snippets",
    template: "%s",
  },
  description: "Share text and code snippets securely with password protection, auto-expiration, and burn-after-reading features. No login required.",
  keywords: ["paste", "pastebin", "code sharing", "text sharing", "snippet", "share code"],
  openGraph: {
    title: "SnipShare - Share Text & Code Snippets",
    description: "Share text and code snippets securely. No login required.",
    type: "website",
    siteName: "SnipShare",
  },
  twitter: {
    card: "summary",
    title: "SnipShare - Share Text & Code Snippets",
    description: "Share text and code snippets securely. No login required.",
  },
  metadataBase: new URL("https://snipshare.pages.dev"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
