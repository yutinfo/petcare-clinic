import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const thai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PetCare Cloud",
  description: "ระบบบริหารจัดการคลินิกสัตว์เลี้ยง",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={`${thai.className} clinic-canvas min-h-screen antialiased`}>{children}</body>
    </html>
  );
}
