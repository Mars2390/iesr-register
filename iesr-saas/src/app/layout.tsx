import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font (no runtime CDN, no layout shift).
// Fetched once during `next build`. Inter (body) + Plus Jakarta Sans (display)
// give the clean, professional SaaS look of the KPLC Sight reference — a warm,
// humanist grotesque instead of the old technical/condensed pairing.
const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});
const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
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
