import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Viphuanan Resort",
  description: "ระบบบริหารรีสอร์ต Viphuanan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
