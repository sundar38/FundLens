import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "FundLens", template: "%s · FundLens" },
  description:
    "Explore Indian mutual funds: NAV history, SIP calculator and an AI fund assistant.",
};

const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <nav className="mx-auto flex h-14 w-full max-w-5xl items-center px-4">
            <Link href="/" className="text-lg font-semibold">
              FundLens
            </Link>
            <Link
              href="/funds"
              className="ml-6 text-sm text-muted-foreground hover:text-foreground"
            >
              Search funds
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
