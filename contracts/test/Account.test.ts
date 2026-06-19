import { expect } from "chai";
import { ethers } from "hardhat";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { Account } from "../typechain-types";

describe("Account", () => {
  let account: Account;
  let user: any;
  let other: any;

  beforeEach(async () => {
    [user, other] = await ethers.getSigners();
    const Account = await ethers.getContractFactory("Account");
    account = await Account.deploy();
  });

  it("registers the caller and emits an event", async () => {
    await expect(account.connect(user).createAccount())
      .to.emit(account, "AccountCreated")
      .withArgs(user.address, anyValue);
    expect(await account.hasAccount(user.address)).to.equal(true);
    expect(await account.exists(user.address)).to.equal(true);
    expect(await account.totalAccounts()).to.equal(1n);
    expect(await account.accountAt(0)).to.equal(user.address);
  });

  it("reports false for wallets without an account", async () => {
    expect(await account.exists(other.address)).to.equal(false);
  });

  it("prevents creating a duplicate account", async () => {
    await account.connect(user).createAccount();
    await expect(account.connect(user).createAccount()).to.be.revertedWith("Account exists");
  });

  it("tracks multiple independent accounts", async () => {
    await account.connect(user).createAccount();
    await account.connect(other).createAccount();
    expect(await account.totalAccounts()).to.equal(2n);
    expect(await account.exists(user.address)).to.equal(true);
    expect(await account.exists(other.address)).to.equal(true);
  });
});
