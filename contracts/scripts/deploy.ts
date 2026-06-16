import { ethers, network } from "hardhat";
import * as dotenv from "dotenv";
dotenv.config();

// G$ token addresses per network
const G_DOLLAR_ADDRESSES: Record<string, string> = {
  celo: "0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A",       // Celo Mainnet
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
  const TREASURY = deployer.address; // Update before mainnet deploy

  // 1. VeraScoreRegistry
  const VeraScoreRegistry = await ethers.getContractFactory("VeraScoreRegistry");
  const scoreRegistry = await VeraScoreRegistry.deploy();
  await scoreRegistry.waitForDeployment();
  console.log("VeraScoreRegistry:", await scoreRegistry.getAddress());

  // 2. VeraGigFeeRouter (UBI pool = deployer for now, update post-deploy)
  const VeraGigFeeRouter = await ethers.getContractFactory("VeraGigFeeRouter");
  const feeRouter = await VeraGigFeeRouter.deploy(G_DOLLAR, TREASURY, TREASURY);
  await feeRouter.waitForDeployment();
  console.log("VeraGigFeeRouter:", await feeRouter.getAddress());

  // 3. VeraGigEscrow
  const VeraGigEscrow = await ethers.getContractFactory("VeraGigEscrow");
  const escrow = await VeraGigEscrow.deploy(
    G_DOLLAR,
    await scoreRegistry.getAddress(),
    await feeRouter.getAddress()
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
  console.log("VeraScoreRegistry:", await scoreRegistry.getAddress());
  console.log("VeraGigFeeRouter:", await feeRouter.getAddress());
  console.log("VeraGigEscrow:", await escrow.getAddress());
  console.log("VeraGigLendingPool:", await lendingPool.getAddress());
  console.log("\nUpdate .env.local in frontend with these addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
