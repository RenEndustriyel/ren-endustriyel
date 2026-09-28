import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/providers/providers";
import { themeScript } from "@/providers/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "latin-ext"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Ren Endüstriyel", template: "%s · Ren Endüstriyel" },
  description: "Ren Endüstriyel ön muhasebe uygulaması",
  applicationName: "Ren Endüstriyel",
  appleWebApp: { capable: true, title: "Ren", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#2c3036",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          id="theme-script"
          dangerouslySetInnerHTML={{ __html: themeScript }}
          suppressHydrationWarning
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
