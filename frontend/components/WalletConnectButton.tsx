"use client";

import type { ComponentProps } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMiniPay } from "@/hooks/useMiniPay";

type WalletConnectButtonProps = ComponentProps<typeof ConnectButton>;

/** Hides RainbowKit connect UI inside MiniPay where the wallet is implicit. */
export function WalletConnectButton(props: WalletConnectButtonProps) {
  const isMiniPay = useMiniPay();

  if (isMiniPay) return null;

  return <ConnectButton {...props} />;
}
