import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SaveBite - Panel Administrativo",
  description: "Sistema de gestión de tienda SaveBite",
  icons: {
    icon: "/savebite.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
