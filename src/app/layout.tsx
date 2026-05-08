import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Money Changer Records",
  description: "Offline daily money changer record encoder",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Records",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg"
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
      <body>{children}</body>
    </html>
  );
}
