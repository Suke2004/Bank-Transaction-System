import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

import { AuthProvider } from "@/lib/context/AuthContext";
import { NotificationProvider } from "@/lib/context/NotificationContext";
import { Toast } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "Bank Ledger — Enterprise Banking",
  description: "Secure, real-time enterprise-grade double-entry ledger banking platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        <AuthProvider>
          <NotificationProvider>
            {children}
            <Toast />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
