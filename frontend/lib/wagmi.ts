import { createConfig, http } from "wagmi";
import { celo } from "wagmi/chains";
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from "@rainbow-me/rainbowkit/wallets";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, coinbaseWallet, walletConnectWallet],
    },
  ],
  {
    appName: "Veragig",
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID ?? "",
  }
);

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors,
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});
