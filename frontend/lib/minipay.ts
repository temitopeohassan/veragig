/** Detect MiniPay in-app browser (window.ethereum.isMiniPay). */
export function isMiniPay(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum?.isMiniPay);
}

/** MiniPay exposes the wallet via window.ethereum (MetaMask-compatible injected provider). */
export function hasEthereumProvider(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(window.ethereum);
}
