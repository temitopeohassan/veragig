export const CONTRACTS = {
  G_DOLLAR: (process.env.NEXT_PUBLIC_G_DOLLAR_ADDRESS ??
    "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A") as `0x${string}`,
  ACCOUNT: (process.env.NEXT_PUBLIC_ACCOUNT_CONTRACT ??
    "0x3FBcCD2496A22C2C4247D2c985EC47EaFa76638e") as `0x${string}`,
  CFA_FORWARDER: (process.env.NEXT_PUBLIC_CFA_FORWARDER ??
    "0xcfA132E353cB4E398080B9700609bb008eceB125") as `0x${string}`,
  IDENTITY: (process.env.NEXT_PUBLIC_IDENTITY_CONTRACT ??
    "0xC361A6E67822a0EDc17D899227dd9FC50BD62F42") as `0x${string}`,
  ESCROW: (process.env.NEXT_PUBLIC_ESCROW_CONTRACT ??
    "0xDa4F6EE5f77883a901F1509b8B3548b95BAfCE5f") as `0x${string}`,
  SCORE_REGISTRY: (process.env.NEXT_PUBLIC_SCORE_REGISTRY ??
    "0xac9861Bf37588Bc17D5B60Bf1EB47C664a572510") as `0x${string}`,
  LENDING_POOL: (process.env.NEXT_PUBLIC_LENDING_POOL ??
    "0x52E0220fe011923f28440C851ae0efD6B3d63f06") as `0x${string}`,
  FEE_ROUTER: (process.env.NEXT_PUBLIC_FEE_ROUTER ??
    "0xE27c10d0a730b0E4B54EF199f54Bc2f7feC1A7B6") as `0x${string}`,
};

export const VERAGIG_ENV =
  (process.env.NEXT_PUBLIC_VERAGIG_ENV as "production" | "staging" | "development") ??
  "production";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
