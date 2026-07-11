import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import "./globals.css";

// Self-hosted (latin subset, variable weight): next/font/google fetches at
// build time, and that download hangs indefinitely on some networks.
const geist = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "ShopKeeper — The Joinery",
  description: "Tool maintenance and consumables inventory for The Joinery shop.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#324168",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geist.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <body className="flex min-h-full flex-col bg-zinc-50 font-sans text-zinc-900">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
