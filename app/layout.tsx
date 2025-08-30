// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";            // <-- this is the key line

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PURK + SCN1 (PURK+) Risk Calculator",
  description: "Clinical decision support for pediatric kidney risk stratification",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50`}>{children}</body>
    </html>
  );
}
