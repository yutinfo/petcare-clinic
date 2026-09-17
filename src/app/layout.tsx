import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PetCare Cloud",
  description: "ระบบบริหารจัดการคลินิกสัตว์เลี้ยง",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
