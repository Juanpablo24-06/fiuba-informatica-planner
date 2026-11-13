import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const nunitoSans = localFont({
  src: "../public/fonts/nunito-sans-latin.woff2",
  variable: "--font-sans",
  display: "swap",
  weight: "400 700",
  adjustFontFallback: false
});

const nunito = localFont({
  src: "../public/fonts/nunito-latin.woff2",
  variable: "--font-display",
  display: "swap",
  weight: "400 700",
  adjustFontFallback: false
});

const plexMono = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-mono-400.woff2", weight: "400" },
    { path: "../public/fonts/ibm-plex-mono-500.woff2", weight: "500" }
  ],
  variable: "--font-mono",
  adjustFontFallback: false,
  display: "swap"
});

const THEME_BOOTSTRAP_SCRIPT = `
(() => {
  try {
    const themeKey = "fiuba-theme";
    const paletteKey = "fiuba-palette";
    const root = document.documentElement;
    const storedTheme = localStorage.getItem(themeKey);
    const themePreference =
      storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "light";
    const resolved =
      themePreference === "system"
        ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
        : themePreference;
    const storedPalette = localStorage.getItem(paletteKey);
    const palette =
      storedPalette === "grafito" ||
      storedPalette === "coral" ||
      storedPalette === "esmeralda" ||
      storedPalette === "indigo"
        ? storedPalette
        : "coral";
    const density = "media";
    root.dataset.theme = resolved;
    root.dataset.palette = palette;
    root.dataset.density = density;
    root.style.colorScheme = resolved;
  } catch (error) {
    document.documentElement.dataset.theme = "light";
    document.documentElement.dataset.palette = "coral";
    document.documentElement.dataset.density = "media";
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export const metadata: Metadata = {
  title: "Plan Ing Informática",
  description: "Organizador privado para Ingeniería en Informática (FIUBA, Plan 2023)."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="es"
      className="scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
      </head>
      <body
        className={`${nunitoSans.variable} ${nunito.variable} ${plexMono.variable} min-h-screen bg-canvas text-text`}
      >
        {children}
      </body>
    </html>
  );
}
