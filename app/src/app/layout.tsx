import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./wallet-overrides.css";
import { Providers } from "@/components/layout/Providers";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CipherMarket",
  description:
    "Trade on outcomes privately. Encrypted positions, settled on Solana via Arcium MPC.",
  icons: { icon: "/brand/logo.svg" },
  openGraph: {
    title: "CipherMarket",
    description: "Confidential prediction markets on Solana with Arcium MPC.",
    url: "https://cipher-market-six.vercel.app",
    siteName: "CipherMarket",
    images: [{ url: "/brand/logo.svg", width: 500, height: 500 }],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CipherMarket",
    description: "Confidential prediction markets on Solana with Arcium MPC.",
    images: ["/brand/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
