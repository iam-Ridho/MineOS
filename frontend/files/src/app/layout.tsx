// src/app/layout.tsx
import { TelemetryProvider } from "@/context/TelemetryContext";
import AppLayout from "@/components/layout/AppLayout";
import "@/styles/globals.css"; // Sesuaikan lokasi globals.css Anda

export const metadata = {
  title: "MineOS Frontend",
  description: "Autonomous Mine Control Digital Twin Operations Panel",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <TelemetryProvider>
          <AppLayout>{children}</AppLayout>
        </TelemetryProvider>
      </body>
    </html>
  );
}