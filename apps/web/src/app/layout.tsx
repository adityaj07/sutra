import type { Metadata } from "next";
import localFont from "next/font/local";

import "../index.css";
import Header from "@/components/header";
import Providers from "@/components/providers";

/**
 * Sūtra's typeface, self-hosted through `next/font/local`: the four weights
 * declared in `@sutra/typography`, bundled from `src/fonts`. Next fingerprints
 * the files, serves them from the build output, and applies `font-display:
 * swap` with a size-adjusted fallback, so there is no runtime CSS import, no
 * render-blocking request to a third party, and no layout shift.
 *
 * The family is exposed as `--font-urbanist`, which `packages/ui` maps to
 * `--font-sans` (and therefore to `font-sans` and the `body` rule). Replacing
 * the typeface means changing this loader and the font assets — no component
 * refers to a family.
 */
const sutraSans = localFont({
  variable: "--font-urbanist",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
  src: [
    { path: "../fonts/Urbanist-Regular.ttf", weight: "400", style: "normal" },
    { path: "../fonts/Urbanist-Medium.ttf", weight: "500", style: "normal" },
    { path: "../fonts/Urbanist-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../fonts/Urbanist-Bold.ttf", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "sutra",
  description: "sutra",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${sutraSans.variable} antialiased`}>
        <Providers>
          <div className="grid h-svh grid-rows-[auto_1fr]">
            <Header />
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
