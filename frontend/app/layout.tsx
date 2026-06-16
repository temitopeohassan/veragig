import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/components/WalletProvider";
import { Navbar } from "@/components/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VeraGig — Gig Marketplace on GoodDollar × Celo",
  description:
    "Earn G$, build your VeraScore, and access micro-loans — powered by Superfluid streaming on Celo.",
  other: {
    "talentapp:project_verification":
      "2f679a4b4eb0e99637e24099f5b66d9feab12ba7b2e29f9248ab6023334eb23645db7f084150326976c129ac0a6d374bedd36faf93d1b1e89e02ee1160454a01",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gd-dark text-gd-text min-h-screen`}>
        <WalletProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
