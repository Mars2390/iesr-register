import type { Metadata, Viewport } from "next";
import { Exo_2, Rajdhani } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font (no runtime CDN, no layout shift).
// Replaces the legacy Google Fonts <link>. Fetched once during `next build`.
const sans = Exo_2({
  subsets: ["latin"],
  weight: ["300", "400", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
const display = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IESR — Smart School Attendance",
  description:
    "Mark attendance in seconds, monitor every class in real time, and turn registers into insight. A modern attendance platform for schools and colleges.",
  applicationName: "IESR",
  icons: { icon: "/images/iesr-4.jpg" },
};

export const viewport: Viewport = {
  themeColor: "#0b66ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
