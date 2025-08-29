import type { Metadata } from "next";
import "./globals.css";

// If you used Geist in the scaffold, import and apply them.
// If not using fonts, you can remove these two lines.
import { Geist, Geist_Mono } from "next/font/google";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Altrii",
  description: "Altrii Recovery",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background antialiased`}>
        {children}
      </body>
    </html>
  );
}
