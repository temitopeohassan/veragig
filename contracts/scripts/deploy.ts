import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// G$ token addresses per network
const G_DOLLAR_ADDRESSES: Record<string, string> = {
  celo: "0x62B8B11039FcfE5aB0C56E502b1C372A3d2a9c7A",       // Celo Mainnet
  "celo-sepolia": "0x0000000000000000000000000000000000000000", // placeholder — set G_DOLLAR_ADDRESS in .env
};

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);
  console.log("Network:", network.name);

  let G_DOLLAR =
    process.env.G_DOLLAR_ADDRESS || G_DOLLAR_ADDRESSES[network.name] || "";

  if (!G_DOLLAR || G_DOLLAR === "0x0000000000000000000000000000000000000000") {
    if (network.name === "celo") {
      throw new Error("G_DOLLAR_ADDRESS is not set for mainnet. Add it to .env");
    }
    // Testnet: deploy a mintable mock G$ token
    console.log("No G$ address configured — deploying ERC20Mock as test G$...");
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    const mockToken = await ERC20Mock.deploy("GoodDollar (Test)", "G$");
    await mockToken.waitForDeployment();
    G_DOLLAR = await mockToken.getAddress();
    console.log("ERC20Mock (test G$):", G_DOLLAR);
  }

  console.log("G$ token:", G_DOLLAR);
  // Treasury / UBI pool for the fee router. Defaults to the deployer; set
  // TREASURY_ADDRESS in .env to route fees to a dedicated treasury/multisig.
  const TREASURY = process.env.TREASURY_ADDRESS || deployer.address;
  console.log("Treasury / UBI pool:", TREASURY);

  // 0. Account registry (records wallets that have created a profile).
  // Set ACCOUNT_ADDRESS in .env to reuse an already-deployed Account (resume a
  // partial deploy) instead of paying to deploy a fresh one.
  const Account = await ethers.getContractFactory("Account");
  const accountRegistry = process.env.ACCOUNT_ADDRESS
    ? Account.attach(process.env.ACCOUNT_ADDRESS)
    : await Account.deploy();
  await accountRegistry.waitForDeployment();
  console.log(
    process.env.ACCOUNT_ADDRESS ? "Account (reused):" : "Account:",
    await accountRegistry.getAddress()
  );

  // 1. VeraScoreRegistry. Set SCORE_REGISTRY_ADDRESS in .env to reuse a deployed one.
  const VeraScoreRegistry = await ethers.getContractFactory("VeraScoreRegistry");
  const scoreRegistry = process.env.SCORE_REGISTRY_ADDRESS
    ? VeraScoreRegistry.attach(process.env.SCORE_REGISTRY_ADDRESS)
    : await VeraScoreRegistry.deploy();
  await scoreRegistry.waitForDeployment();
  console.log(
    process.env.SCORE_REGISTRY_ADDRESS ? "VeraScoreRegistry (reused):" : "VeraScoreRegistry:",
    await scoreRegistry.getAddress()
  );

  // 2. VeraGigFeeRouter (UBI pool = deployer for now, update post-deploy)
  const VeraGigFeeRouter = await ethers.getContractFactory("VeraGigFeeRouter");
  const feeRouter = await VeraGigFeeRouter.deploy(G_DOLLAR, TREASURY, TREASURY);
  await feeRouter.waitForDeployment();
  console.log("VeraGigFeeRouter:", await feeRouter.getAddress());

  // 3. VeraGigEscrow
  // Trusted relayer = backend signer operated by the official frontend (https://useveragig.online).
  // Defaults to the deployer; update post-deploy via escrow.setTrustedRelayer(BACKEND_SIGNER).
  const TRUSTED_RELAYER = process.env.RELAYER_ADDRESS || deployer.address;
  console.log("Trusted relayer:", TRUSTED_RELAYER);
  const VeraGigEscrow = await ethers.getContractFactory("VeraGigEscrow");
  const escrow = await VeraGigEscrow.deploy(
    G_DOLLAR,
    await scoreRegistry.getAddress(),
    await feeRouter.getAddress(),
    TRUSTED_RELAYER
  );
  await escrow.waitForDeployment();
  console.log("VeraGigEscrow:", await escrow.getAddress());

  // 4. VeraGigLendingPool
  const VeraGigLendingPool = await ethers.getContractFactory("VeraGigLendingPool");
  const lendingPool = await VeraGigLendingPool.deploy(
    G_DOLLAR,
    await scoreRegistry.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("VeraGigLendingPool:", await lendingPool.getAddress());

  // Authorize escrow to call fee router
  await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true);

  // Authorize escrow to update scores
  await scoreRegistry.setAuthorizedUpdater(await escrow.getAddress(), true);

  console.log("\n--- Deployment Summary ---");
  console.log("Account:", await accountRegistry.getAddress());
  console.log("VeraScoreRegistry:", await scoreRegistry.getAddress());
  console.log("VeraGigFeeRouter:", await feeRouter.getAddress());
  console.log("VeraGigEscrow:", await escrow.getAddress());
  console.log("VeraGigLendingPool:", await lendingPool.getAddress());
  console.log("Trusted relayer:", TRUSTED_RELAYER);
  console.log("\nUpdate .env.local in frontend with these addresses!");
  console.log("Set the real backend relayer with: escrow.setTrustedRelayer(BACKEND_SIGNER)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
