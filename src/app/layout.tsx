import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SVJ Správa",
  description: "Aplikace pro správu společenství vlastníků jednotek",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${geistSans.variable} h-full`}>
      <body className="h-full bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
