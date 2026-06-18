"use client";

import { useAccount } from "wagmi";
import { WalletConnectButton } from "@/components/WalletConnectButton";
import { useMiniPay } from "@/hooks/useMiniPay";

type ConnectPromptProps = {
  title: string;
  description: string;
};

export function ConnectPrompt({ title, description }: ConnectPromptProps) {
  const { isConnecting, isReconnecting } = useAccount();
  const isMiniPay = useMiniPay();
  const waitingForWallet = isMiniPay || isConnecting || isReconnecting;

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {waitingForWallet ? (
        <>
          <p className="text-gd-muted">Connecting to MiniPay…</p>
          <div className="h-8 w-8 rounded-full border-2 border-gd-green/30 border-t-gd-green animate-spin" />
        </>
      ) : (
        <>
          <p className="text-gd-muted">{description}</p>
          <WalletConnectButton />
        </>
      )}
    </div>
  );
}
