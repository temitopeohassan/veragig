"use client";

import { useEffect } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { isMiniPay, hasEthereumProvider } from "@/lib/minipay";

/**
 * MiniPay provides an implicit wallet connection — auto-connect on load and
 * never prompt the user to connect manually. See:
 * https://docs.celo.org/build-on-celo/build-on-minipay/quickstart
 */
export function MiniPayAutoConnect() {
  const { isConnected, isConnecting, isReconnecting } = useAccount();
  const { connect, connectors } = useConnect();

  useEffect(() => {
    if (!isMiniPay() || !hasEthereumProvider()) return;
    if (isConnected || isConnecting || isReconnecting) return;

    const injectedConnector =
      connectors.find((c) => c.id === "metaMask" || c.id === "metaMaskSDK" || c.type === "injected") ??
      injected({ target: "metaMask" });

    connect({ connector: injectedConnector });
  }, [connect, connectors, isConnected, isConnecting, isReconnecting]);

  return null;
}
