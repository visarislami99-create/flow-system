import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AutoFlows — AI built for the businesses that can't afford to get it wrong.",
  description:
    "AI automation consulting for professional services firms. Audit, build, scale.",
  metadataBase: new URL("https://autoflows.consulting"),
  openGraph: {
    title: "AutoFlows",
    description:
      "Your team, finally focused.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link
          rel="preload"
          as="fetch"
          href="/coin.glb"
          crossOrigin="anonymous"
          type="model/gltf-binary"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
