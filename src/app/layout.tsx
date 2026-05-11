import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const viewport: Viewport = {
  themeColor: "#0B0E14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Image2SVG | Precision Raster to Vector Converter",
  description:
    "Transform raster imagery into crisp, infinitely scalable vector graphics. A powerful, private, browser-based tool powered by WASM. Zero uploads, works offline.",
  keywords: [
    "image to svg",
    "vectorizer",
    "raster to vector",
    "svg converter",
    "wasm",
    "private vectorizer",
    "image2svg",
  ],
  authors: [{ name: "Image2SVG" }],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    title: "Image2SVG | Precision Raster to Vector Converter",
    description:
      "Transform raster imagery into crisp, infinitely scalable vector graphics. A powerful, private, browser-based tool powered by WASM. Zero uploads, works offline.",
    type: "website",
    siteName: "Image2SVG",
    images: [
      {
        url: "/logo.png",
        width: 1024,
        height: 1024,
        alt: "Image2SVG Brand Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Image2SVG | Precision Raster to Vector Converter",
    description: "Transform raster imagery into crisp, infinitely scalable vector graphics.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className={`${inter.variable} ${inter.className} antialiased bg-[#0B0E14] text-white`}>
        {children}
      </body>
    </html>
  );
}
