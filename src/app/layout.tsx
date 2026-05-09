import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// @ts-ignore
import "./globals.css";
import { Toaster } from "sonner";


export const metadata: Metadata = {
  title: "Alshizamin FXD System",
  description: "Client-first local-first foreign exchange operations PWA for Alshizamin Money Changer.",
  keywords: [
    "foreign exchange",
    "money changer",
    "FX operations",
    "currency exchange",
    "PWA",
    "local-first",
    "offline-first"
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Alshizamin FXD",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png"
  }
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
