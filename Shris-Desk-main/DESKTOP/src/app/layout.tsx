import type { Metadata } from "next";
import { ClientStartupCleanup } from "@/components/client-startup-cleanup";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartDesk",
  description:
    "SmartDesk platform with welcome-first role access and a production-focused Superadmin control console.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <ClientStartupCleanup />
        {children}
      </body>
    </html>
  );
}
