import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/Toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Altrii Recovery",
  description: "Digital wellness with device locks and safe browsing",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className + " min-h-screen bg-background antialiased"}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
