import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Start your tattoo",
  description: "Automated tattoo intake, estimation, and booking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={body.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
