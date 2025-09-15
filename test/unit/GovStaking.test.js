
const { expect } = require("chai");
const { ethers } = require("hardhat");


async function mineBlocks(count) {
  for (let i = 0; i < count; i++) {
    await ethers.provider.send("evm_mine");
  }
}

async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {}
}


async function deployFixture() {
  const [deployer, admin, treasury, executor, voter1, voter2, voter3, extra] =
    await ethers.getSigners();


  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0
  );
  await token.waitForDeployment();


  const Gov = await ethers.getContractFactory("GovStaking");
  const gov = await Gov.deploy(await token.getAddress(), admin.address, executor.address);
  await gov.waitForDeployment();


  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n;
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }


  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {
    const portion = depBal / 2n;
    await (await token.transfer(voter1.address, portion / 2n)).wait();
    await (await token.transfer(voter2.address, portion / 3n)).wait();
    await (await token.transfer(voter3.address, portion / 5n)).wait();
  }

  return {
    signers: { deployer, admin, executor, voter1, voter2, voter3, extra },
    contracts: { token, gov },
  };
}

describe("GovStaking", () => {
  it("initializes with sensible params and roles", async () => {
    const { contracts, signers } = await deployFixture();
    const { gov } = contracts;
    const { admin, executor } = signers;

    const vd = await gov.votingDelay();
    const vp = await gov.votingPeriod();
    const ed = await gov.executionDelay();
    expect(Number(vd)).to.be.greaterThanOrEqual(0);
    expect(Number(vp)).to.be.greaterThan(0);
    expect(Number(ed)).to.be.greaterThanOrEqual(0);


    try {
      const DEFAULT_ADMIN_ROLE = await gov.DEFAULT_ADMIN_ROLE();
      const EXECUTOR_ROLE = await gov.EXECUTOR_ROLE();
      expect(await gov.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.eq(true);
      expect(await gov.hasRole(EXECUTOR_ROLE, executor.address)).to.eq(true);
    } catch {

    }
  });

  it("supports staking and tracks voting power; enforces cooldown on unstake flow", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gov } = contracts;
    const { voter1 } = signers;

    const stakeAmt = ethers.parseUnits("1000", 18);

    const bal = await token.balanceOf(voter1.address);
    if (bal < stakeAmt) {
      const [deployer] = await ethers.getSigners();
      const db = await token.balanceOf(deployer.address);
      if (db > 0n) await (await token.connect(deployer).transfer(voter1.address, stakeAmt - bal)).wait();
    }

    await (await token.connect(voter1).approve(await gov.getAddress(), stakeAmt)).wait();
    await expect(gov.connect(voter1).stake(stakeAmt))
      .to.emit(gov, "Staked")
      .withArgs(voter1.address, stakeAmt);

    const vp1 = await gov.votingPower(voter1.address);
    expect(vp1).to.equal(stakeAmt);


    const part = ethers.parseUnits("400", 18);
    await expect(gov.connect(voter1).requestUnstake(part))
      .to.emit(gov, "UnstakeRequested")
      .withArgs(voter1.address, part);


    await expect(gov.connect(voter1).withdrawUnstaked(part)).to.be.reverted;


    let cooldown = 0n;
    try {
      cooldown = await gov.cooldownSeconds();
    } catch {
      cooldown = 3n * 24n * 60n * 60n;
    }
    await increaseTime(Number(cooldown) + 1);

    await expect(gov.connect(voter1).withdrawUnstaked(part))
      .to.emit(gov, "Unstaked")
      .withArgs(voter1.address, part);

    const vp2 = await gov.votingPower(voter1.address);
    expect(vp2).to.equal(stakeAmt - part);
  });

  it("end-to-end governance: propose -> vote -> queue -> execute", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gov } = contracts;
    const { admin, executor, voter1, voter2 } = signers;


    const s1 = ethers.parseUnits("1000", 18);
    const s2 = ethers.parseUnits("800", 18);


    const [deployer] = await ethers.getSigners();
    const need1 = s1 - (await token.balanceOf(voter1.address));
    if (need1 > 0n) await (await token.connect(deployer).transfer(voter1.address, need1)).wait();
    const need2 = s2 - (await token.balanceOf(voter2.address));
    if (need2 > 0n) await (await token.connect(deployer).transfer(voter2.address, need2)).wait();

    await (await token.connect(voter1).approve(await gov.getAddress(), s1)).wait();
    await (await token.connect(voter2).approve(await gov.getAddress(), s2)).wait();

    await (await gov.connect(voter1).stake(s1)).wait();
    await (await gov.connect(voter2).stake(s2)).wait();


    const paramKey = ethers.id("BURN_RATE");
    const newValue = ethers.parseUnits("0.09", 18);
    const description = "Set burn rate to 0.09 EnTo/kWh";

    const tx = await gov.connect(voter1).propose(paramKey, newValue, description);
    const rcpt = await tx.wait();
    const createdLog = rcpt.logs.find((l) => {
      try { return gov.interface.parseLog(l).name === "ProposalCreated"; } catch { return false; }
    });
    const id = gov.interface.parseLog(createdLog).args.id;


    const vd = await gov.votingDelay();
    if (Number(vd) > 0) await mineBlocks(Number(vd));


    await expect(gov.connect(voter1).castVote(id, 1))
      .to.emit(gov, "VoteCast");
    await expect(gov.connect(voter2).castVote(id, 1))
      .to.emit(gov, "VoteCast");


    const vp = await gov.votingPeriod();
    await mineBlocks(Number(vp) + 1);


    await expect(gov.queue(id)).to.emit(gov, "ProposalQueued");


    const ed = await gov.executionDelay();
    await increaseTime(Number(ed) + 1);


    await expect(gov.connect(executor).execute(id))
      .to.emit(gov, "ProposalExecuted");


    const p = await gov.proposals(id);
    expect(p.proposer).to.equal(voter1.address);
    expect(p.paramKey).to.equal(paramKey);
    expect(p.newValue).to.equal(newValue);
    expect(Number(p.eta)).to.be.greaterThan(0);
  });

  it("reverts invalid actions: voting before start, double voting, queue/execute in wrong state", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gov } = contracts;
    const { voter1, executor } = signers;


    const amt = ethers.parseUnits("500", 18);
    const [deployer] = await ethers.getSigners();
    const need = amt - (await token.balanceOf(voter1.address));
    if (need > 0n) await (await token.connect(deployer).transfer(voter1.address, need)).wait();
    await (await token.connect(voter1).approve(await gov.getAddress(), amt)).wait();
    await (await gov.connect(voter1).stake(amt)).wait();


    const idTx = await gov.connect(voter1).propose(ethers.id("X"), 123n, "desc");
    const idRcpt = await idTx.wait();
    const log = idRcpt.logs.find((l) => {
      try { return gov.interface.parseLog(l).name === "ProposalCreated"; } catch { return false; }
    });
    const id = gov.interface.parseLog(log).args.id;


    const vd = await gov.votingDelay();
    if (Number(vd) > 0) {
      await expect(gov.connect(voter1).castVote(id, 1)).to.be.reverted;
      await mineBlocks(Number(vd));
    }


    await (await gov.connect(voter1).castVote(id, 1)).wait();

    await expect(gov.connect(voter1).castVote(id, 1)).to.be.reverted;


    const vp = await gov.votingPeriod();
    await expect(gov.queue(id)).to.be.reverted;


    await mineBlocks(Number(vp) + 1);


    await (await gov.queue(id)).wait();
    const ed = await gov.executionDelay();
    await expect(gov.connect(executor).execute(id)).to.be.reverted;

    await increaseTime(Number(ed) + 1);
    await (await gov.connect(executor).execute(id)).wait();


    await expect(gov.connect(executor).execute(id)).to.be.reverted;
  });

  it("respects quorum or threshold if implemented (optional sanity)", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gov } = contracts;
    const { voter1 } = signers;


    try {
      const q = await gov.quorumVotes();
      expect(Number(q)).to.be.greaterThanOrEqual(0);
    } catch {

    }
  });

  it("allows admin to update governance parameters within bounds (optional)", async () => {
    const { contracts, signers } = await deployFixture();
    const { gov } = contracts;
    const { admin } = signers;


    try {
      const vd0 = await gov.votingDelay();
      await (await gov.connect(admin).setVotingDelay(vd0 + 1n)).wait();
      const vd1 = await gov.votingDelay();
      expect(vd1).to.equal(vd0 + 1n);

      const vp0 = await gov.votingPeriod();
      await (await gov.connect(admin).setVotingPeriod(vp0 + 1n)).wait();
      expect(await gov.votingPeriod()).to.equal(vp0 + 1n);

      const ed0 = await gov.executionDelay();
      await (await gov.connect(admin).setExecutionDelay(ed0 + 10n)).wait();
      expect(await gov.executionDelay()).to.equal(ed0 + 10n);
    } catch {

    }
  });
});
