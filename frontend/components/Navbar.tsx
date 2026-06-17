"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { IdentityBadge } from "./IdentityVerification";
import { useAccount } from "wagmi";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/tasks", label: "Tasks" },
  { href: "/post-task", label: "Post Task" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/loan", label: "Loans" },
];

export function Navbar() {
  const { isConnected } = useAccount();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="border-b border-gd-border bg-gd-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="VeraGig" width={32} height={32} className="h-8 w-8" priority />
            <span className="text-xl font-bold text-gd-text">
              Vera<span className="text-gd-green">Gig</span>
            </span>
          </Link>

          {isConnected && (
            <div className="hidden md:flex items-center gap-6 text-sm text-gd-muted">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="hover:text-gd-text transition-colors">
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {isConnected && <IdentityBadge />}
          <ConnectButton
            chainStatus="icon"
            showBalance={{ smallScreen: false, largeScreen: true }}
            accountStatus="avatar"
          />

          {isConnected && (
            <button
              type="button"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
              className="md:hidden p-2 -mr-2 text-gd-muted hover:text-gd-text transition-colors"
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          )}
        </div>
      </div>

      {isConnected && mobileOpen && (
        <div className="md:hidden border-t border-gd-border bg-gd-dark/95 backdrop-blur-sm">
          <div className="px-4 py-3 flex flex-col gap-1 text-sm text-gd-muted">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="py-2 px-2 rounded-md hover:bg-gd-border/40 hover:text-gd-text transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
