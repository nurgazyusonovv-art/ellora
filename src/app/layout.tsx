import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorker } from "@/components/pwa";

export const metadata: Metadata = {
  title: { default: "ellora", template: "%s · ellora" },
  description: "Информатика сабактарын 5 бөлүктүү заманбап методика менен онлайн өтүү платформасы.",
  applicationName: "ellora",
  appleWebApp: { capable: true, title: "ellora", statusBarStyle: "black-translucent" },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#15242a" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ky">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Unbounded:wght@500;700&display=swap"
        />
      </head>
      <body className="min-h-dvh antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
