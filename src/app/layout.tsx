import "./globals.css";

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Mono, Fraunces, Manrope } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["300", "400"],
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://audioguestbooks.ca";

export const metadata: Metadata = {
  /** Resolves relative `canonical`, `openGraph.url`, and image paths site-wide. */
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Audio Guest Books",
    template: "%s — Audio Guest Books",
  },
  description:
    "Branded delivery pages, automatic file processing, and analytics for wedding and event audio guest books.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${manrope.variable} ${dmMono.variable} ${fraunces.variable} font-sans antialiased`}
      >
        <ClerkProvider
          appearance={{
            cssLayerName: "clerk",
            variables: {
              colorPrimary: "#1a1a1a",
              colorPrimaryForeground: "#f6f4ef",
              colorForeground: "#1a1a1a",
              colorMutedForeground: "#45423c",
              colorBackground: "#ffffff",
              colorMuted: "#f3efe8",
              colorNeutral: "#9c9590",
              colorBorder: "#e6e3dc",
              colorInput: "#ffffff",
              colorInputForeground: "#1a1a1a",
              colorRing: "#c9a96e",
              fontFamily: "inherit",
            },
            elements: {
              userButtonPopoverActionButton: {
                color: "#1a1a1a",
              },
              userButtonPopoverActionButtonIcon: {
                color: "#1a1a1a",
              },
            },
          }}
        >
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
