import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import MobileMenu from "@/components/MobileMenu";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trading AI Platform",
  description: "پلتفرم هوشمند تحلیل بازار، سیگنال و مدیریت معاملات",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">

      <body>

        <Navbar />

        <MobileMenu />

        {children}

      </body>

    </html>
  );
}
