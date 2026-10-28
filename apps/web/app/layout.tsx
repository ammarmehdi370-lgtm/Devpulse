import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Devpulse",
    template: "%s — Devpulse",
  },
  description: "Cloud developer platform. Code, collaborate, deploy.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Devpulse",
    description: "Code. Collaborate. Pulse.",
    siteName: "Devpulse",
    type: "website",
  },
  themeColor: "#8B5CF6",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${plusJakarta.variable}`}>
      <body className="bg-[#09090e] text-[#ededf5] min-h-screen">
        {children}
      </body>
    </html>
  );
}
