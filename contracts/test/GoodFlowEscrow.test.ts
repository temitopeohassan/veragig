import { expect } from "chai";
import { ethers } from "hardhat";
import { VeraGigEscrow, VeraScoreRegistry, VeraGigFeeRouter } from "../typechain-types";

describe("VeraGigEscrow", () => {
  let escrow: VeraGigEscrow;
  let scoreRegistry: VeraScoreRegistry;
  let feeRouter: VeraGigFeeRouter;
  let mockToken: any;
  let client: any;
  let worker: any;
  let owner: any;
  let relayer: any;
  let attacker: any;

  const deadline = () => Math.floor(Date.now() / 1000) + 86400;

  beforeEach(async () => {
    [owner, client, worker, relayer, attacker] = await ethers.getSigners();

    // Deploy mock ERC20
    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockToken = await ERC20Mock.deploy("GoodDollar", "G$");

    const VeraScoreRegistry = await ethers.getContractFactory("VeraScoreRegistry");
    scoreRegistry = await VeraScoreRegistry.deploy();

    const VeraGigFeeRouter = await ethers.getContractFactory("VeraGigFeeRouter");
    feeRouter = await VeraGigFeeRouter.deploy(
      await mockToken.getAddress(),
      owner.address,
      owner.address
    );

    const VeraGigEscrow = await ethers.getContractFactory("VeraGigEscrow");
    escrow = await VeraGigEscrow.deploy(
      await mockToken.getAddress(),
      await scoreRegistry.getAddress(),
      await feeRouter.getAddress(),
      relayer.address
    );

    // Authorize escrow to call fee router
    await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true);

    // Mint tokens to client and approve the escrow (client funds the task)
    await mockToken.mint(client.address, ethers.parseEther("1000"));
    await mockToken.connect(client).approve(await escrow.getAddress(), ethers.MaxUint256);
    await mockToken.connect(client).approve(await feeRouter.getAddress(), ethers.MaxUint256);
  });

  it("creates a task and deposits escrow (via relayer)", async () => {
    const taskId = ethers.id("task-1");
    const reward = ethers.parseEther("100");

    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, reward, deadline());

    const task = await escrow.getTask(taskId);
    expect(task.client).to.equal(client.address);
    expect(task.rewardWei).to.equal(reward);
    expect(task.status).to.equal(0); // Open
  });

  it("assigns and completes a task", async () => {
    const taskId = ethers.id("task-2");
    const reward = ethers.parseEther("50");

    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, reward, deadline());
    // assignTask / submitDeliverable remain user-callable (no fund movement)
    await escrow.connect(client).assignTask(taskId, worker.address);

    const deliverableCid = ethers.id("ipfs-cid");
    await escrow.connect(worker).submitDeliverable(taskId, deliverableCid);

    const workerBalanceBefore = await mockToken.balanceOf(worker.address);
    await escrow.connect(relayer).approveAndRelease(taskId, client.address, 5);

    const workerBalanceAfter = await mockToken.balanceOf(worker.address);
    expect(workerBalanceAfter - workerBalanceBefore).to.equal(reward);
  });

  it("allows cancelling an open task and refunds the client (via relayer)", async () => {
    const taskId = ethers.id("task-3");
    const reward = ethers.parseEther("100");

    const clientBalanceBefore = await mockToken.balanceOf(client.address);
    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, reward, deadline());
    await escrow.connect(relayer).cancelTask(taskId, client.address);

    const clientBalanceAfter = await mockToken.balanceOf(client.address);
    expect(clientBalanceAfter).to.equal(clientBalanceBefore);
  });

  describe("relayer / owner access control", () => {
    it("owner can also move funds (createTask)", async () => {
      const taskId = ethers.id("task-owner");
      await escrow
        .connect(owner)
        .createTask(taskId, client.address, ethers.parseEther("10"), deadline());
      expect((await escrow.getTask(taskId)).client).to.equal(client.address);
    });

    it("reverts createTask from a non-relayer, non-owner caller", async () => {
      const taskId = ethers.id("task-bad");
      await expect(
        escrow
          .connect(attacker)
          .createTask(taskId, client.address, ethers.parseEther("10"), deadline())
      ).to.be.revertedWith("Not relayer or owner");
    });

    it("reverts approveAndRelease and cancelTask from non-relayer callers", async () => {
      const taskId = ethers.id("task-guard");
      const reward = ethers.parseEther("20");
      await escrow.connect(relayer).createTask(taskId, client.address, reward, deadline());

      // client can no longer release/cancel directly — must go through the relayer
      await expect(
        escrow.connect(client).cancelTask(taskId, client.address)
      ).to.be.revertedWith("Not relayer or owner");

      await escrow.connect(client).assignTask(taskId, worker.address);
      await escrow.connect(worker).submitDeliverable(taskId, ethers.id("cid"));
      await expect(
        escrow.connect(client).approveAndRelease(taskId, client.address, 5)
      ).to.be.revertedWith("Not relayer or owner");
    });

    it("reverts when relayer names the wrong client", async () => {
      const taskId = ethers.id("task-wrongclient");
      const reward = ethers.parseEther("20");
      await escrow.connect(relayer).createTask(taskId, client.address, reward, deadline());
      await expect(
        escrow.connect(relayer).cancelTask(taskId, attacker.address)
      ).to.be.revertedWith("Not client");
    });
  });

  describe("setTrustedRelayer", () => {
    it("lets the owner rotate the relayer and emits an event", async () => {
      await expect(escrow.connect(owner).setTrustedRelayer(attacker.address))
        .to.emit(escrow, "TrustedRelayerUpdated")
        .withArgs(relayer.address, attacker.address);
      expect(await escrow.trustedRelayer()).to.equal(attacker.address);
    });

    it("reverts for non-owner and for the zero address", async () => {
      await expect(
        escrow.connect(attacker).setTrustedRelayer(attacker.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
      await expect(
        escrow.connect(owner).setTrustedRelayer(ethers.ZeroAddress)
      ).to.be.revertedWith("Zero relayer");
    });
  });

  describe("emergencyWithdraw", () => {
    it("lets only the owner (deployer) withdraw funds directly", async () => {
      // Fund the escrow via a task deposit
      const taskId = ethers.id("task-ew");
      const reward = ethers.parseEther("100");
      await escrow.connect(relayer).createTask(taskId, client.address, reward, deadline());

      const escrowAddr = await escrow.getAddress();
      const balance = await mockToken.balanceOf(escrowAddr);
      expect(balance).to.be.gt(0n);

      // Non-owners (including the relayer) cannot withdraw directly
      await expect(
        escrow.connect(relayer).emergencyWithdraw(await mockToken.getAddress(), relayer.address, balance)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
      await expect(
        escrow.connect(attacker).emergencyWithdraw(await mockToken.getAddress(), attacker.address, balance)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");

      // Owner can
      const ownerBefore = await mockToken.balanceOf(owner.address);
      await expect(
        escrow.connect(owner).emergencyWithdraw(await mockToken.getAddress(), owner.address, balance)
      )
        .to.emit(escrow, "EmergencyWithdraw")
        .withArgs(await mockToken.getAddress(), owner.address, balance);
      expect(await mockToken.balanceOf(owner.address)).to.equal(ownerBefore + balance);
    });
  });
});
