import { ethers } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// Read-only verification of the live VeraGig contracts on whichever network this
// runs against. Detects whether the escrow / fee router are the OLD single-token
// build or the NEW multi-token build, and checks token whitelist + wiring.
//
// Override the addresses to verify a fresh deploy:
//   ESCROW_CONTRACT=0x... FEE_ROUTER=0x... npm run verify:celo

const ADDR = {
  escrow: process.env.ESCROW_CONTRACT || "0xDa4F6EE5f77883a901F1509b8B3548b95BAfCE5f",
  feeRouter: process.env.FEE_ROUTER || "0xE27c10d0a730b0E4B54EF199f54Bc2f7feC1A7B6",
  scoreRegistry: process.env.SCORE_REGISTRY_ADDRESS || "0xac9861Bf37588Bc17D5B60Bf1EB47C664a572510",
};

const TOKENS: Record<string, string> = {
  "G$": "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
  USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
  CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
};

const RELAYER = process.env.RELAYER_ADDRESS;

// Minimal probe ABIs (old + new selectors).
const ESCROW_ABI = [
  "function trustedRelayer() view returns (address)",
  "function feeRouter() view returns (address)",
  "function scoreRegistry() view returns (address)",
  "function FEE_BPS() view returns (uint256)",
  "function allowedToken(address) view returns (bool)", // NEW only
  "function gDollar() view returns (address)",          // OLD only
];
const FEEROUTER_ABI = [
  "function ubiPool() view returns (address)",
  "function treasury() view returns (address)",
  "function authorizedCallers(address) view returns (bool)",
  "function gDollar() view returns (address)",          // OLD only
];
const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

async function tryCall<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try { return await fn(); } catch { return undefined; }
}

async function main() {
  const provider = ethers.provider;
  const net = await provider.getNetwork();
  console.log(`Network: chainId ${net.chainId}\n`);

  // --- Escrow ---
  console.log(`Escrow @ ${ADDR.escrow}`);
  const escrowCode = await provider.getCode(ADDR.escrow);
  if (escrowCode === "0x") {
    console.log("  ✗ NO CONTRACT CODE at this address\n");
  } else {
    const escrow = new ethers.Contract(ADDR.escrow, ESCROW_ABI, provider);
    const isNew = (await tryCall(() => escrow.allowedToken(TOKENS["G$"]))) !== undefined;
    const isOld = (await tryCall(() => escrow.gDollar())) !== undefined;
    console.log(`  version: ${isNew ? "NEW (multi-token)" : isOld ? "OLD (single-token G$)" : "UNKNOWN"}`);
    const relayer = await tryCall(() => escrow.trustedRelayer());
    const fr = await tryCall(() => escrow.feeRouter());
    console.log(`  trustedRelayer: ${relayer ?? "?"}${RELAYER ? (relayer?.toLowerCase() === RELAYER.toLowerCase() ? "  ✓ matches RELAYER_ADDRESS" : "  ! differs from RELAYER_ADDRESS") : ""}`);
    console.log(`  feeRouter: ${fr ?? "?"}${fr ? (fr.toLowerCase() === ADDR.feeRouter.toLowerCase() ? "  ✓ matches" : "  ! differs from configured FEE_ROUTER") : ""}`);
    if (isNew) {
      for (const [sym, addr] of Object.entries(TOKENS)) {
        const ok = await tryCall(() => escrow.allowedToken(addr));
        console.log(`  allowedToken[${sym}]: ${ok ? "✓ whitelisted" : "✗ NOT whitelisted"}`);
      }
    }
    console.log("");
  }

  // --- Fee router ---
  console.log(`FeeRouter @ ${ADDR.feeRouter}`);
  const frCode = await provider.getCode(ADDR.feeRouter);
  if (frCode === "0x") {
    console.log("  ✗ NO CONTRACT CODE at this address\n");
  } else {
    const fee = new ethers.Contract(ADDR.feeRouter, FEEROUTER_ABI, provider);
    const isOld = (await tryCall(() => fee.gDollar())) !== undefined;
    console.log(`  version: ${isOld ? "OLD (single-token)" : "NEW (multi-token)"}`);
    console.log(`  ubiPool: ${(await tryCall(() => fee.ubiPool())) ?? "?"}`);
    console.log(`  treasury: ${(await tryCall(() => fee.treasury())) ?? "?"}`);
    const auth = await tryCall(() => fee.authorizedCallers(ADDR.escrow));
    console.log(`  authorizedCallers[escrow]: ${auth ? "✓ authorized" : "✗ NOT authorized"}\n`);
  }

  // --- Tokens ---
  console.log("Reward tokens:");
  for (const [sym, addr] of Object.entries(TOKENS)) {
    const code = await provider.getCode(addr);
    if (code === "0x") { console.log(`  ${sym} @ ${addr}: ✗ no code`); continue; }
    const t = new ethers.Contract(addr, ERC20_ABI, provider);
    const symbol = await tryCall(() => t.symbol());
    const decimals = await tryCall(() => t.decimals());
    console.log(`  ${sym} @ ${addr}: symbol=${symbol ?? "?"} decimals=${decimals ?? "?"}`);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
