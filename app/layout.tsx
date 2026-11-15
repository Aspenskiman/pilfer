import type { Metadata, Viewport } from "next";
import { Bagel_Fat_One, Bricolage_Grotesque, Geist_Mono } from "next/font/google";
import "./globals.css";

// Display: fat, rounded and inky, like the mascot's outline.
const display = Bagel_Fat_One({
  weight: "400",
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

// Body and interface text.
const body = Bricolage_Grotesque({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Pilfer, the online White Elephant game, by Jamble",
    template: "%s · Pilfer by Jamble",
  },
  description:
    "Host a live White Elephant gift exchange online. Everyone plays from their phone, the big screen shows every steal. Free for up to 10 players.",
  openGraph: {
    title: "Pilfer, the online White Elephant game, by Jamble",
    description:
      "Open, steal, lock. A live White Elephant game for friends, families and teams. Free for up to 10 players.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#15162c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
