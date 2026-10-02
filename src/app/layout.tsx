import type { Metadata, Viewport } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { ReminderProvider } from "@/components/reminder-provider";
import "./globals.css";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });
const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL || "https://elara-nu.vercel.app"),
  applicationName: "Elara",
  title: { default: "Elara", template: "%s · Elara" },
  description: "The intelligent workspace for executive operations.",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Elara",
    title: "Elara · Executive operations, intelligently organized",
    description: "Prepare meetings, manage communication, coordinate travel, and keep every commitment moving.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Elara · Executive operations, intelligently organized",
    description: "Prepare meetings, manage communication, coordinate travel, and keep every commitment moving.",
  },
};

export const viewport: Viewport = {
  themeColor: "#111827",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <ReminderProvider />
        {children}
      </body>
    </html>
  );
}
