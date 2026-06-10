"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { IdentityBadge } from "./IdentityVerification";
import { useAccount } from "wagmi";

export function Navbar() {
  const { isConnected } = useAccount();

  return (
    <nav className="border-b border-gd-border bg-gd-dark/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-gd-green">Good</span>
            <span className="text-xl font-bold text-gd-text">Flow</span>
          </Link>

          {isConnected && (
            <div className="hidden md:flex items-center gap-6 text-sm text-gd-muted">
              <Link href="/tasks" className="hover:text-gd-text transition-colors">Tasks</Link>
              <Link href="/post-task" className="hover:text-gd-text transition-colors">Post Task</Link>
              <Link href="/dashboard" className="hover:text-gd-text transition-colors">Dashboard</Link>
              <Link href="/loan" className="hover:text-gd-text transition-colors">Loans</Link>
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
        </div>
      </div>
    </nav>
  );
}
