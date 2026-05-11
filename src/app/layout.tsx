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
  metadataBase: new URL("https://image2svg.vercel.app"),
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
        url: "/banner.png",
        width: 1280,
        height: 640,
        alt: "Image2SVG — Browser-native raster to SVG converter",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Image2SVG | Browser-native Raster → SVG Converter",
    description:
      "Convert any image to crisp SVG — 100% in your browser. Powered by VTracer WASM. Zero uploads, works offline.",
    images: ["/banner.png"],
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
