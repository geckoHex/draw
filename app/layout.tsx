import { SerwistProvider } from "@serwist/next/react";
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import { IPadAppBehavior } from "@/components/ipad-app-behavior";
import { ThemeManager } from "@/components/theme-manager";
import "./globals.css";

const satoshi = localFont({
  src: [
    {
      path: "../public/fonts/Satoshi-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-Italic.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/Satoshi-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Satoshi-BoldItalic.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-satoshi",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "GeckoDraw",
  title: "GeckoDraw",
  description: "Free, local, no account whiteboard creator and manager with power-user features and a modern UI.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GeckoDraw",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-167x167.png", sizes: "167x167", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => { const dark = matchMedia("(prefers-color-scheme: dark)").matches; const root = document.documentElement; root.classList.toggle("dark", dark); root.dataset.theme = dark ? "dark" : "light"; root.style.colorScheme = dark ? "dark" : "light"; })();`,
          }}
        />
      </head>
      <body
        className={`${satoshi.variable} ${geistMono.variable} antialiased`}
      >
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <IPadAppBehavior />
          <ThemeManager />
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
