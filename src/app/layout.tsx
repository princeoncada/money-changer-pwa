import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
// @ts-ignore
import "./globals.css";
import { Toaster } from "sonner";


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
      <body>
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
