import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qrave Superadmin",
  description: "Global admin console for Qrave",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
