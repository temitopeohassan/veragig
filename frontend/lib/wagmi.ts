import { http } from "wagmi";
import { celo, celoSepolia } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// getDefaultConfig bundles a broad set of popular wallets (MetaMask, Rainbow,
// Coinbase, Trust, Ledger, Rabby, ...) and the WalletConnect "All Wallets" QR
// flow, which lets 500+ mobile wallets connect via WalletConnect.
export const wagmiConfig = getDefaultConfig({
  appName: "VeraGig",
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "",
  chains: [celoSepolia, celo],
  ssr: true,
  transports: {
    [celoSepolia.id]: http("https://forno.celo-sepolia.celo-testnet.org"),
    [celo.id]: http("https://forno.celo.org"),
  },
});
