import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
//import RaspberryPiRibbon from '@/components/HostedOnARPI';
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Excuse Me, What?",
  description: "A wild excuse generator appears!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* <RaspberryPiRibbon /> */}
        {children}
      </body>
    </html>
  );
}
