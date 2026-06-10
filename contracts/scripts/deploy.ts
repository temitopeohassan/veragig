import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const G_DOLLAR = "0x62B8B11039fcfE5AB0C56E502b1C372A3D2a9C7A"; // Celo Mainnet
  const TREASURY = deployer.address; // Update before mainnet deploy

  // 1. GoodScoreRegistry
  const GoodScoreRegistry = await ethers.getContractFactory("GoodScoreRegistry");
  const scoreRegistry = await GoodScoreRegistry.deploy();
  await scoreRegistry.waitForDeployment();
  console.log("GoodScoreRegistry:", await scoreRegistry.getAddress());

  // 2. GoodFlowFeeRouter (UBI pool = deployer for now, update post-deploy)
  const GoodFlowFeeRouter = await ethers.getContractFactory("GoodFlowFeeRouter");
  const feeRouter = await GoodFlowFeeRouter.deploy(G_DOLLAR, TREASURY, TREASURY);
  await feeRouter.waitForDeployment();
  console.log("GoodFlowFeeRouter:", await feeRouter.getAddress());

  // 3. GoodFlowEscrow
  const GoodFlowEscrow = await ethers.getContractFactory("GoodFlowEscrow");
  const escrow = await GoodFlowEscrow.deploy(
    G_DOLLAR,
    await scoreRegistry.getAddress(),
    await feeRouter.getAddress()
  );
  await escrow.waitForDeployment();
  console.log("GoodFlowEscrow:", await escrow.getAddress());

  // 4. GoodFlowLendingPool
  const GoodFlowLendingPool = await ethers.getContractFactory("GoodFlowLendingPool");
  const lendingPool = await GoodFlowLendingPool.deploy(
    G_DOLLAR,
    await scoreRegistry.getAddress()
  );
  await lendingPool.waitForDeployment();
  console.log("GoodFlowLendingPool:", await lendingPool.getAddress());

  // Authorize escrow to call fee router
  await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true);

  // Authorize escrow to update scores
  await scoreRegistry.setAuthorizedUpdater(await escrow.getAddress(), true);

  console.log("\n--- Deployment Summary ---");
  console.log("GoodScoreRegistry:", await scoreRegistry.getAddress());
  console.log("GoodFlowFeeRouter:", await feeRouter.getAddress());
  console.log("GoodFlowEscrow:", await escrow.getAddress());
  console.log("GoodFlowLendingPool:", await lendingPool.getAddress());
  console.log("\nUpdate .env.local in frontend with these addresses!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
