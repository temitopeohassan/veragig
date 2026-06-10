import { expect } from "chai";
import { ethers } from "hardhat";
import { GoodFlowEscrow, GoodScoreRegistry, GoodFlowFeeRouter } from "../typechain-types";

describe("GoodFlowEscrow", () => {
  let escrow: GoodFlowEscrow;
  let scoreRegistry: GoodScoreRegistry;
  let feeRouter: GoodFlowFeeRouter;
  let mockToken: any;
  let client: any;
  let worker: any;
  let owner: any;

  beforeEach(async () => {
    [owner, client, worker] = await ethers.getSigners();

    // Deploy mock ERC20
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockToken = await ERC20Mock.deploy("GoodDollar", "G$");

    const GoodScoreRegistry = await ethers.getContractFactory("GoodScoreRegistry");
    scoreRegistry = await GoodScoreRegistry.deploy();

    const GoodFlowFeeRouter = await ethers.getContractFactory("GoodFlowFeeRouter");
    feeRouter = await GoodFlowFeeRouter.deploy(
      await mockToken.getAddress(),
      owner.address,
      owner.address
    );

    const GoodFlowEscrow = await ethers.getContractFactory("GoodFlowEscrow");
    escrow = await GoodFlowEscrow.deploy(
      await mockToken.getAddress(),
      await scoreRegistry.getAddress(),
      await feeRouter.getAddress()
    );

    // Authorize escrow to call fee router
    await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true);

    // Mint tokens to client
    await mockToken.mint(client.address, ethers.parseEther("1000"));
    await mockToken.connect(client).approve(await escrow.getAddress(), ethers.MaxUint256);
    await mockToken.connect(client).approve(await feeRouter.getAddress(), ethers.MaxUint256);
  });

  it("creates a task and deposits escrow", async () => {
    const taskId = ethers.id("task-1");
    const reward = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await escrow.connect(client).createTask(taskId, reward, deadline, true, 7);

    const task = await escrow.getTask(taskId);
    expect(task.client).to.equal(client.address);
    expect(task.rewardWei).to.equal(reward);
    expect(task.status).to.equal(0); // Open
  });

  it("assigns and completes a task", async () => {
    const taskId = ethers.id("task-2");
    const reward = ethers.parseEther("50");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await escrow.connect(client).createTask(taskId, reward, deadline, false, 7);
    await escrow.connect(client).assignTask(taskId, worker.address);

    const deliverableCid = ethers.id("ipfs-cid");
    await escrow.connect(worker).submitDeliverable(taskId, deliverableCid);

    const workerBalanceBefore = await mockToken.balanceOf(worker.address);
    await escrow.connect(client).approveAndRelease(taskId, 5);

    const workerBalanceAfter = await mockToken.balanceOf(worker.address);
    expect(workerBalanceAfter - workerBalanceBefore).to.equal(reward);
  });

  it("allows client to cancel an open task", async () => {
    const taskId = ethers.id("task-3");
    const reward = ethers.parseEther("100");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    const clientBalanceBefore = await mockToken.balanceOf(client.address);
    await escrow.connect(client).createTask(taskId, reward, deadline, true, 7);
    await escrow.connect(client).cancelTask(taskId);

    const clientBalanceAfter = await mockToken.balanceOf(client.address);
    expect(clientBalanceAfter).to.equal(clientBalanceBefore);
  });
});
