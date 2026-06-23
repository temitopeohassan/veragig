import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// Focused redeploy of just the multi-token FeeRouter + Escrow, reusing the
// already-deployed Account / VeraScoreRegistry / LendingPool. Use this to roll
// out the multi-token + bounty changes without touching the other contracts.
//
// Required .env:
//   PRIVATE_KEY            deployer (must own the existing VeraScoreRegistry)
//   SCORE_REGISTRY_ADDRESS existing VeraScoreRegistry
// Optional .env:
//   TREASURY_ADDRESS       fee treasury / UBI pool (defaults to deployer)
//   RELAYER_ADDRESS        backend signer (defaults to deployer; set later via
//                          escrow.setTrustedRelayer)
//   G_DOLLAR_ADDRESS, USDT_ADDRESS, CELO_ADDRESS  override reward tokens

const DEFAULT_TOKENS: Record<string, Record<string, string>> = {
  celo: {
    "G$": "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",
    USDT: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    CELO: "0x471EcE3750Da237f93B8E339c536989b8978a438",
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Network:", network.name);

  const SCORE_REGISTRY = process.env.SCORE_REGISTRY_ADDRESS;
  if (!SCORE_REGISTRY) throw new Error("Set SCORE_REGISTRY_ADDRESS in .env");

  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  const TRUSTED_RELAYER = process.env.RELAYER_ADDRESS || deployer.address;
  console.log("ScoreRegistry (reused):", SCORE_REGISTRY);
  console.log("Treasury / UBI pool:", TREASURY);
  console.log("Trusted relayer:", TRUSTED_RELAYER);

  const tokens = { ...(DEFAULT_TOKENS[network.name] || {}) };
  if (process.env.G_DOLLAR_ADDRESS) tokens["G$"] = process.env.G_DOLLAR_ADDRESS;
  if (process.env.USDT_ADDRESS) tokens.USDT = process.env.USDT_ADDRESS;
  if (process.env.CELO_ADDRESS) tokens.CELO = process.env.CELO_ADDRESS;

  // 1. Fee router (multi-token). Reuse an already-deployed one (resume a partial
  //    deploy) by setting FEE_ROUTER in .env, otherwise deploy a fresh router.
  const VeraGigFeeRouter = await ethers.getContractFactory("VeraGigFeeRouter");
  const feeRouter = process.env.FEE_ROUTER
    ? VeraGigFeeRouter.attach(process.env.FEE_ROUTER)
    : await VeraGigFeeRouter.deploy(TREASURY, TREASURY);
  await feeRouter.waitForDeployment();
  console.log(
    process.env.FEE_ROUTER ? "VeraGigFeeRouter (reused):" : "VeraGigFeeRouter:",
    await feeRouter.getAddress()
  );

  // 2. Escrow (multi-token, gig + bounty).
  const VeraGigEscrow = await ethers.getContractFactory("VeraGigEscrow");
  const escrow = await VeraGigEscrow.deploy(
    SCORE_REGISTRY,
    await feeRouter.getAddress(),
    TRUSTED_RELAYER
  );
  await escrow.waitForDeployment();
  console.log("VeraGigEscrow:", await escrow.getAddress());

  // 3. Whitelist reward tokens.
  for (const [symbol, addr] of Object.entries(tokens)) {
    if (!addr || addr === "0x0000000000000000000000000000000000000000") continue;
    const tx = await escrow.setAllowedToken(addr, true);
    await tx.wait();
    console.log(`  whitelisted ${symbol}: ${addr}`);
  }

  // 4. Wire permissions: escrow may call the fee router and update scores.
  await (await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true)).wait();
  console.log("  feeRouter.setAuthorizedCaller(escrow) ✓");

  const scoreRegistry = await ethers.getContractAt("VeraScoreRegistry", SCORE_REGISTRY);
  try {
    await (await scoreRegistry.setAuthorizedUpdater(await escrow.getAddress(), true)).wait();
    console.log("  scoreRegistry.setAuthorizedUpdater(escrow) ✓");
  } catch (e: any) {
    console.warn("  ! Could not set score updater (deployer may not own the registry):", e.message);
    console.warn("    Run scoreRegistry.setAuthorizedUpdater(ESCROW, true) from the owner.");
  }

  console.log("\n--- Redeploy Summary ---");
  console.log("VeraGigFeeRouter:", await feeRouter.getAddress());
  console.log("VeraGigEscrow:", await escrow.getAddress());
  console.log("\nNext steps:");
  console.log("1. Update backend .env: ESCROW_CONTRACT + FEE_ROUTER to the new addresses.");
  console.log("2. Update frontend .env.local: NEXT_PUBLIC_ESCROW_CONTRACT + NEXT_PUBLIC_FEE_ROUTER.");
  console.log("3. If RELAYER_ADDRESS was not the backend signer, run escrow.setTrustedRelayer(BACKEND_SIGNER).");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
