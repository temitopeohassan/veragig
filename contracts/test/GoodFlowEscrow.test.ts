import { expect } from "chai";
import { ethers } from "hardhat";
import { VeraGigEscrow, VeraScoreRegistry, VeraGigFeeRouter } from "../typechain-types";

const GIG = 0;
const BOUNTY = 1;

describe("VeraGigEscrow", () => {
  let escrow: VeraGigEscrow;
  let scoreRegistry: VeraScoreRegistry;
  let feeRouter: VeraGigFeeRouter;
  let mockToken: any;
  let otherToken: any;
  let client: any;
  let worker: any;
  let worker2: any;
  let worker3: any;
  let owner: any;
  let relayer: any;
  let attacker: any;

  const deadline = () => Math.floor(Date.now() / 1000) + 86400;

  beforeEach(async () => {
    [owner, client, worker, worker2, worker3, relayer, attacker] = await ethers.getSigners();

    const ERC20Mock = await ethers.getContractFactory("ERC20Mock");
    mockToken = await ERC20Mock.deploy("GoodDollar", "G$");
    otherToken = await ERC20Mock.deploy("Tether USD", "USDT");

    const VeraScoreRegistry = await ethers.getContractFactory("VeraScoreRegistry");
    scoreRegistry = await VeraScoreRegistry.deploy();

    const VeraGigFeeRouter = await ethers.getContractFactory("VeraGigFeeRouter");
    feeRouter = await VeraGigFeeRouter.deploy(owner.address, owner.address);

    const VeraGigEscrow = await ethers.getContractFactory("VeraGigEscrow");
    escrow = await VeraGigEscrow.deploy(
      await scoreRegistry.getAddress(),
      await feeRouter.getAddress(),
      relayer.address
    );

    // Authorize escrow to call fee router and whitelist the reward token.
    await feeRouter.setAuthorizedCaller(await escrow.getAddress(), true);
    await escrow.setAllowedToken(await mockToken.getAddress(), true);

    // Mint to client and approve the escrow (client funds the task).
    await mockToken.mint(client.address, ethers.parseEther("1000"));
    await mockToken.connect(client).approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  it("creates a gig task and deposits escrow (via relayer)", async () => {
    const taskId = ethers.id("task-1");
    const reward = ethers.parseEther("100");

    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);

    const task = await escrow.getTask(taskId);
    expect(task.client).to.equal(client.address);
    expect(task.token).to.equal(await mockToken.getAddress());
    expect(task.rewardWei).to.equal(reward);
    expect(task.status).to.equal(0); // Open
    expect(task.taskType).to.equal(GIG);
  });

  it("rejects creating a task in a non-whitelisted token", async () => {
    const taskId = ethers.id("task-bad-token");
    await expect(
      escrow
        .connect(relayer)
        .createTask(taskId, client.address, await otherToken.getAddress(), ethers.parseEther("10"), deadline(), GIG)
    ).to.be.revertedWith("Token not allowed");
  });

  it("assigns and completes a gig, paying the worker and routing the fee", async () => {
    const taskId = ethers.id("task-2");
    const reward = ethers.parseEther("50");
    const fee = (reward * 200n) / 10000n;

    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);
    await escrow.connect(client).assignTask(taskId, worker.address);
    await escrow.connect(worker).submitDeliverable(taskId, ethers.id("ipfs-cid"));

    const workerBefore = await mockToken.balanceOf(worker.address);
    const ownerBefore = await mockToken.balanceOf(owner.address); // owner = ubiPool + treasury
    await escrow.connect(relayer).approveAndRelease(taskId, client.address, 5);

    expect((await mockToken.balanceOf(worker.address)) - workerBefore).to.equal(reward);
    // Full fee routed to owner (acts as both ubiPool and treasury here).
    expect((await mockToken.balanceOf(owner.address)) - ownerBefore).to.equal(fee);
    // Escrow fully drained for this task.
    expect(await mockToken.balanceOf(await escrow.getAddress())).to.equal(0n);
  });

  describe("bounty mode", () => {
    it("splits the reward equally among selected winners", async () => {
      const taskId = ethers.id("bounty-1");
      const reward = ethers.parseEther("90");

      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), BOUNTY);

      const winners = [worker.address, worker2.address, worker3.address];
      const before = await Promise.all(winners.map((w) => mockToken.balanceOf(w)));

      await escrow.connect(relayer).approveBountyWinners(taskId, client.address, winners, 5);

      const after = await Promise.all(winners.map((w) => mockToken.balanceOf(w)));
      const share = reward / 3n;
      expect(after[0] - before[0]).to.equal(share);
      expect(after[1] - before[1]).to.equal(share);
      expect(after[2] - before[2]).to.equal(share);
      expect((await escrow.getTask(taskId)).status).to.equal(3); // Completed
    });

    it("gives the integer-division remainder to the first winner", async () => {
      const taskId = ethers.id("bounty-remainder");
      const reward = 100n; // not divisible by 3

      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), BOUNTY);

      const winners = [worker.address, worker2.address, worker3.address];
      const before = await Promise.all(winners.map((w) => mockToken.balanceOf(w)));
      await escrow.connect(relayer).approveBountyWinners(taskId, client.address, winners, 4);
      const after = await Promise.all(winners.map((w) => mockToken.balanceOf(w)));

      const share = reward / 3n; // 33
      const remainder = reward - share * 3n; // 1
      expect(after[0] - before[0]).to.equal(share + remainder); // 34
      expect(after[1] - before[1]).to.equal(share); // 33
      expect(after[2] - before[2]).to.equal(share); // 33
      // Whole reward distributed, escrow drained.
      expect(await mockToken.balanceOf(await escrow.getAddress())).to.equal(0n);
    });

    it("reverts approveBountyWinners on a gig task and vice versa", async () => {
      const gigId = ethers.id("gig-x");
      const bountyId = ethers.id("bounty-x");
      const reward = ethers.parseEther("10");
      const token = await mockToken.getAddress();

      await escrow.connect(relayer).createTask(gigId, client.address, token, reward, deadline(), GIG);
      await escrow.connect(relayer).createTask(bountyId, client.address, token, reward, deadline(), BOUNTY);

      await expect(
        escrow.connect(relayer).approveBountyWinners(gigId, client.address, [worker.address], 5)
      ).to.be.revertedWith("Not a bounty");

      await expect(
        escrow.connect(client).assignTask(bountyId, worker.address)
      ).to.be.revertedWith("Not a gig");
    });

    it("requires at least one winner and a valid rating", async () => {
      const taskId = ethers.id("bounty-empty");
      const reward = ethers.parseEther("10");
      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), BOUNTY);

      await expect(
        escrow.connect(relayer).approveBountyWinners(taskId, client.address, [], 5)
      ).to.be.revertedWith("No winners");
      await expect(
        escrow.connect(relayer).approveBountyWinners(taskId, client.address, [worker.address], 0)
      ).to.be.revertedWith("Rating 1-5");
    });
  });

  it("allows cancelling an open task and refunds the client (via relayer)", async () => {
    const taskId = ethers.id("task-3");
    const reward = ethers.parseEther("100");

    const clientBalanceBefore = await mockToken.balanceOf(client.address);
    await escrow
      .connect(relayer)
      .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);
    await escrow.connect(relayer).cancelTask(taskId, client.address);

    expect(await mockToken.balanceOf(client.address)).to.equal(clientBalanceBefore);
  });

  describe("token whitelist", () => {
    it("only the owner can whitelist tokens", async () => {
      await expect(
        escrow.connect(attacker).setAllowedToken(await otherToken.getAddress(), true)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });

    it("accepts a task once a token is whitelisted", async () => {
      await escrow.setAllowedToken(await otherToken.getAddress(), true);
      await otherToken.mint(client.address, ethers.parseEther("100"));
      await otherToken.connect(client).approve(await escrow.getAddress(), ethers.MaxUint256);

      const taskId = ethers.id("task-usdt");
      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await otherToken.getAddress(), ethers.parseEther("10"), deadline(), GIG);
      expect((await escrow.getTask(taskId)).token).to.equal(await otherToken.getAddress());
    });
  });

  describe("relayer / owner access control", () => {
    it("owner can also move funds (createTask)", async () => {
      const taskId = ethers.id("task-owner");
      await escrow
        .connect(owner)
        .createTask(taskId, client.address, await mockToken.getAddress(), ethers.parseEther("10"), deadline(), GIG);
      expect((await escrow.getTask(taskId)).client).to.equal(client.address);
    });

    it("reverts createTask from a non-relayer, non-owner caller", async () => {
      const taskId = ethers.id("task-bad");
      await expect(
        escrow
          .connect(attacker)
          .createTask(taskId, client.address, await mockToken.getAddress(), ethers.parseEther("10"), deadline(), GIG)
      ).to.be.revertedWith("Not relayer or owner");
    });

    it("reverts approveAndRelease and cancelTask from non-relayer callers", async () => {
      const taskId = ethers.id("task-guard");
      const reward = ethers.parseEther("20");
      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);

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
      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);
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
      const taskId = ethers.id("task-ew");
      const reward = ethers.parseEther("100");
      await escrow
        .connect(relayer)
        .createTask(taskId, client.address, await mockToken.getAddress(), reward, deadline(), GIG);

      const escrowAddr = await escrow.getAddress();
      const balance = await mockToken.balanceOf(escrowAddr);
      expect(balance).to.be.gt(0n);

      await expect(
        escrow.connect(relayer).emergencyWithdraw(await mockToken.getAddress(), relayer.address, balance)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");

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
