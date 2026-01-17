import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "Planificador FIUBA Informática",
  description: "Organizador privado para Ingeniería en Informática (FIUBA, Plan 2023)."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="scroll-smooth">
      <body
        className={`${spaceGrotesk.variable} ${plexMono.variable} min-h-screen bg-canvas text-text`}
      >
        {children}
      </body>
    </html>
  );
}
