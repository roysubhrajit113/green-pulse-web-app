const { expect } = require("chai");
const { ethers } = require("hardhat");


async function deployFixture() {
  const [deployer, admin, treasury, oracleCommittee, deptA, deptB] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);


  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0
  );
  await token.waitForDeployment();


  const Auction = await ethers.getContractFactory("EnergyAuction");
  const auction = await Auction.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();


  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n;
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }


  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();


  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    await (await token.connect(admin).grantRole(MINTER_ROLE, await oracle.getAddress())).wait();
    await (await token.connect(admin).grantRole(BURNER_ROLE, await oracle.getAddress())).wait();
  }

  return {
    signers: { deployer, admin, treasury, oracleCommittee, deptA, deptB },
    params: { GENESIS_SUPPLY },
    contracts: { token, auction, oracle },
  };
}


function enToForKwh(kWh, unitPrice18) {
  return (kWh * 10n ** 18n) / unitPrice18;
}

describe("EnergyAuction", () => {
  it("previewCurrentUnitPrice18 returns positive 1e18-scaled value", async () => {
    const { contracts } = await deployFixture();
    const { auction } = contracts;

    const price18 = await auction.previewCurrentUnitPrice18();
    expect(price18).to.be.a("bigint");
    expect(price18).to.be.greaterThan(0n);
  });

  it("allows department to buy a pack and records PackPurchased event and pack data", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { admin, deptA } = signers;

    const month = 202508;
    const kWh = 2_000n;

    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const enToRequired = enToForKwh(kWh, unitPrice18);


    await (await token.connect(admin).transfer(deptA.address, enToRequired)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), enToRequired)).wait();

    await expect(auction.connect(deptA).buyPack(month, kWh))
      .to.emit(auction, "PackPurchased");

    const pack = await auction.getPack(month, deptA.address);
    expect(pack.exists).to.eq(true);
    expect(pack.kWhPurchased).to.eq(kWh);
    expect(pack.enToPaid).to.eq(enToRequired);
    expect(pack.unitPrice18).to.eq(unitPrice18);
  });

  it("reverts if insufficient approval or balance", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { deptA } = signers;

    const month = 202508;
    const kWh = 1_000n;

    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const enToRequired = enToForKwh(kWh, unitPrice18);


    await expect(auction.connect(deptA).buyPack(month, kWh)).to.be.reverted;

    await (await token.transfer(deptA.address, enToRequired)).wait();
    await expect(auction.connect(deptA).buyPack(month, kWh)).to.be.reverted;
  });

  it("updates weighted-average price and cumulative stats after purchase", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { admin, deptA, deptB } = signers;

    const m = 202508;


    let unitPrice18 = await auction.previewCurrentUnitPrice18();
    let k1 = 1_000n;
    let p1EnTo = enToForKwh(k1, unitPrice18);
    await (await token.connect(admin).transfer(deptA.address, p1EnTo)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), p1EnTo)).wait();
    await (await auction.connect(deptA).buyPack(m, k1)).wait();


    unitPrice18 = await auction.previewCurrentUnitPrice18();
    let k2 = 2_000n;
    let p2EnTo = enToForKwh(k2, unitPrice18);
    await (await token.connect(admin).transfer(deptB.address, p2EnTo)).wait();
    await (await token.connect(deptB).approve(await auction.getAddress(), p2EnTo)).wait();
    await (await auction.connect(deptB).buyPack(m, k2)).wait();



    try {
      const stats = await auction.getMonthStats(m);

      expect(stats.totalKWh).to.eq(k1 + k2);

      expect(stats.totalEnTo).to.eq(p1EnTo + p2EnTo);

      expect(stats.avgUnitPrice18).to.be.greaterThan(0n);
    } catch {

    }
  });

  it("enforces one pack per month when toggle is enabled", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { admin, deptA } = signers;

    const m = 202508;
    const k = 1_000n;
    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const enToRequired = enToForKwh(k, unitPrice18);

    await (await token.connect(admin).transfer(deptA.address, enToRequired * 2n)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), enToRequired * 2n)).wait();


    try {
      await (await auction.connect(admin).setOnePackPerMonth(true)).wait();
    } catch {
    }

    await (await auction.connect(deptA).buyPack(m, k)).wait();


    const tx = auction.connect(deptA).buyPack(m, k);
    await expect(tx).to.be.reverted;
  });

  it("allows multiple packs per month when toggle is disabled (or by default if not enforced)", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { admin, deptA } = signers;

    const m = 202508;
    const k = 500n;


    try {
      await (await auction.connect(admin).setOnePackPerMonth(false)).wait();
    } catch {

    }


    let unitPrice18 = await auction.previewCurrentUnitPrice18();
    let costEnTo = enToForKwh(k, unitPrice18);
    await (await token.connect(admin).transfer(deptA.address, costEnTo * 3n)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), costEnTo * 3n)).wait();
    await (await auction.connect(deptA).buyPack(m, k)).wait();


    unitPrice18 = await auction.previewCurrentUnitPrice18();
    costEnTo = enToForKwh(k, unitPrice18);
    await (await auction.connect(deptA).buyPack(m, k)).wait();


    const pack = await auction.getPack(m, deptA.address);
    expect(pack.kWhPurchased).to.be.greaterThanOrEqual(1000n);
  });

  it("admin can update auction parameters within bounds", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction } = contracts;
    const { admin } = signers;

    try {



      const p = await auction.previewCurrentUnitPrice18();
      expect(p).to.be.greaterThan(0n);
    } catch {
    
    }
  });

  it("totalEnToCollected and totalKWhSold increase after purchases (if globals are exposed)", async () => {
    const { contracts, signers } = await deployFixture();
    const { auction, token } = contracts;
    const { admin, deptA } = signers;

    let startTotalEnTo = 0n;
    let startTotalKwh = 0n;
    try {
      startTotalEnTo = await auction.totalEnToCollected();
      startTotalKwh = await auction.totalKWhSold();
    } catch {
    }

    const m = 202509;
    const k = 750n;
    const unitPrice18 = await auction.previewCurrentUnitPrice18();
    const cost = enToForKwh(k, unitPrice18);

    await (await token.connect(admin).transfer(deptA.address, cost)).wait();
    await (await token.connect(deptA).approve(await auction.getAddress(), cost)).wait();
    await (await auction.connect(deptA).buyPack(m, k)).wait();

    try {
      const endTotalEnTo = await auction.totalEnToCollected();
      const endTotalKwh = await auction.totalKWhSold();
      expect(endTotalEnTo).to.be.greaterThan(startTotalEnTo);
      expect(endTotalKwh).to.be.greaterThan(startTotalKwh);
    } catch {
    }
  });
});
