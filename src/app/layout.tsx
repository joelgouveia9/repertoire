import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import { Disc3 } from "lucide-react";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Repertoire — Find the royalties your songs are losing",
  description:
    "Repertoire cross-references the world's royalty organizations to make sure every song you release is registered correctly — and flags where money is leaking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#07070a] font-sans text-neutral-100">
        <nav className="sticky top-0 z-20 border-b border-white/5 bg-[#07070a]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-black">
                <Disc3 className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <span className="text-[15px] font-semibold tracking-tight text-white">Repertoire</span>
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
                beta
              </span>
            </Link>
            <Link
              href="/#artists"
              className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-neutral-200 ring-1 ring-white/10 transition-colors hover:bg-white/10"
            >
              Run an audit
            </Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
