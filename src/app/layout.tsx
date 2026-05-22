import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "MineOS Dashboard",
  description: "Mining Operations Intelligence System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}