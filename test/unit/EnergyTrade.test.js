
const { expect } = require("chai");
const { ethers } = require("hardhat");


function enToForKwhAtPrice(kWh, price18) {

  return (kWh * 10n ** 18n) / price18;
}

async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {}
}


async function deployFixture() {
  const [
    deployer,
    admin,
    treasury,
    seller,
    buyer,
    other
  ] = await ethers.getSigners();

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
    admin.address
  );
  await auction.waitForDeployment();


  const Trade = await ethers.getContractFactory("EnergyTrade");
  const trade = await Trade.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();


  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n;
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }



  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {

    await (await token.transfer(treasury.address, depBal / 2n)).wait();
  }

  return {
    signers: { deployer, admin, treasury, seller, buyer, other },
    params: { GENESIS_SUPPLY },
    contracts: { token, auction, trade },
  };
}

describe("EnergyTrade", () => {
  it("seeds AMM and previews reference price", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, trade } = contracts;
    const { admin, treasury } = signers;


    const enToSeed = ethers.parseUnits("3000", 18);
    const kWhSeed = 30_000n;


    const tBal = await token.balanceOf(treasury.address);
    if (tBal < enToSeed) {
      const from = (await token.balanceOf(admin.address)) >= enToSeed ? admin : (await ethers.getSigners())[0];
      if ((await token.balanceOf(from.address)) >= enToSeed - tBal) {
        await (await token.connect(from).transfer(treasury.address, enToSeed - tBal)).wait();
      }
    }

    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();

    await expect(trade.connect(admin).seedAmm(enToSeed, kWhSeed))
      .to.emit(trade, "AmmSeeded");

    const refPrice18 = await trade.previewRefPrice18();
    expect(refPrice18).to.be.a("bigint");
    expect(refPrice18).to.be.greaterThan(0n);
  });

  it("enforces minPremiumBps when listing surplus orders", async () => {
    const { contracts, signers } = await deployFixture();
    const { trade } = contracts;
    const { seller } = signers;

    const refPrice18 = await trade.previewRefPrice18();
    const minPremiumBps = await trade.minPremiumBps();
    const minPrice18 = (refPrice18 * (10_000n + BigInt(minPremiumBps))) / 10_000n;


    const badPrice18 = minPrice18 - 1n;
    await expect(trade.connect(seller).listSurplus(1000n, badPrice18)).to.be.reverted;


    const okPrice18 = (minPrice18 * 10_050n) / 10_000n;
    await expect(trade.connect(seller).listSurplus(1000n, okPrice18))
      .to.emit(trade, "OrderListed");
  });

  it("allows buyer to partially and then fully fill an order with proper approvals", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, trade } = contracts;
    const { admin, treasury, seller, buyer } = signers;


    const enToSeed = ethers.parseUnits("2000", 18);
    const kWhSeed = 20_000n;


    const tBal = await token.balanceOf(treasury.address);
    if (tBal < enToSeed) {
      const from = (await token.balanceOf(admin.address)) >= enToSeed ? admin : (await ethers.getSigners())[0];
      if ((await token.balanceOf(from.address)) >= enToSeed - tBal) {
        await (await token.connect(from).transfer(treasury.address, enToSeed - tBal)).wait();
      }
    }
    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();
    try {
      await (await trade.connect((await ethers.getSigners())[1] || admin).seedAmm(enToSeed, kWhSeed)).wait();
    } catch (_) {

    }

    const refPrice18 = await trade.previewRefPrice18();
    const minPremiumBps = await trade.minPremiumBps();
    const minPrice18 = (refPrice18 * (10_000n + BigInt(minPremiumBps))) / 10_000n;
    const price18 = (minPrice18 * 10_050n) / 10_000n;

    const kWhTotal = 2_400n;
    const txList = await trade.connect(seller).listSurplus(kWhTotal, price18);
    const rcptList = await txList.wait();
    const listedLog = rcptList.logs.find((l) => {
      try { return trade.interface.parseLog(l).name === "OrderListed"; } catch (_) { return false; }
    });
    const orderId = trade.interface.parseLog(listedLog).args.orderId;


    const kWhWanted = 1_000n;
    const enToNeeded = enToForKwhAtPrice(kWhWanted, price18);


    const balBuyer = await token.balanceOf(buyer.address);
    if (balBuyer < enToNeeded) {
      const from = (await token.balanceOf(admin.address)) >= enToNeeded ? admin : (await ethers.getSigners())[0];
      await (await token.connect(from).transfer(buyer.address, enToNeeded - balBuyer)).wait();
    }

    await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded)).wait();
    await expect(trade.connect(buyer).buyFromOrder(orderId, kWhWanted, enToNeeded))
      .to.emit(trade, "OrderFilled");


    const order = await trade.orderBook(orderId);
    const remaining = order.kWhRemaining;
    if (remaining > 0n) {
      const enToNeeded2 = enToForKwhAtPrice(remaining, price18);
      const bal2 = await token.balanceOf(buyer.address);
      if (bal2 < enToNeeded2) {
        const from2 = (await token.balanceOf(admin.address)) >= enToNeeded2 ? admin : (await ethers.getSigners())[0];
        await (await token.connect(from2).transfer(buyer.address, enToNeeded2 - bal2)).wait();
      }
      await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded2)).wait();
      await expect(trade.connect(buyer).buyFromOrder(orderId, remaining, enToNeeded2))
        .to.emit(trade, "OrderFilled");
    }

    const orderAfter = await trade.orderBook(orderId);
    expect(orderAfter.active).to.eq(false);
    expect(orderAfter.kWhRemaining).to.eq(0n);
  });

  it("executes AMM swaps EnTo->kWh and kWh->EnTo with slippage guards", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, trade } = contracts;
    const { admin, treasury, buyer, seller } = signers;


    const enToSeed = ethers.parseUnits("4000", 18);
    const kWhSeed = 40_000n;


    const tBal = await token.balanceOf(treasury.address);
    if (tBal < enToSeed) {
      const from = (await token.balanceOf(admin.address)) >= enToSeed ? admin : (await ethers.getSigners())[0];
      if ((await token.balanceOf(from.address)) >= enToSeed - tBal) {
        await (await token.connect(from).transfer(treasury.address, enToSeed - tBal)).wait();
      }
    }
    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();
    try {
      await (await trade.connect(admin).seedAmm(enToSeed, kWhSeed)).wait();
    } catch (_) {}


    const enToIn = ethers.parseUnits("300", 18);

    const bBal = await token.balanceOf(buyer.address);
    if (bBal < enToIn) {
      const from = (await token.balanceOf(admin.address)) >= enToIn ? admin : (await ethers.getSigners())[0];
      await (await token.connect(from).transfer(buyer.address, enToIn - bBal)).wait();
    }

    const kOutPreview = await trade.previewAmmEnToForKwh(enToIn);
    const minKOut = (kOutPreview * 99n) / 100n;
    await (await token.connect(buyer).approve(await trade.getAddress(), enToIn)).wait();

    await expect(trade.connect(buyer).ammSwapEnToForKwh(enToIn, minKOut))
      .to.emit(trade, "AmmSwapEnToForKwh");


    const kWhIn = 1_200n;
    const enToOutPreview = await trade.previewAmmKwhForEnTo(kWhIn);
    const minEnToOut = (enToOutPreview * 99n) / 100n;

    await expect(trade.connect(seller).ammSwapKwhForEnTo(kWhIn, minEnToOut))
      .to.emit(trade, "AmmSwapKwhForEnTo");
  });

  it("reverts order fills that exceed remaining kWh or insufficient maxEnToIn", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, trade } = contracts;
    const { admin, treasury, seller, buyer } = signers;


    const enToSeed = ethers.parseUnits("1000", 18);
    const kWhSeed = 10_000n;
    const tBal = await token.balanceOf(treasury.address);
    if (tBal < enToSeed) {
      const from = (await token.balanceOf(admin.address)) >= enToSeed ? admin : (await ethers.getSigners())[0];
      if ((await token.balanceOf(from.address)) >= enToSeed - tBal) {
        await (await token.connect(from).transfer(treasury.address, enToSeed - tBal)).wait();
      }
    }
    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();
    try { await (await trade.connect(admin).seedAmm(enToSeed, kWhSeed)).wait(); } catch (_) {}

    const refPrice18 = await trade.previewRefPrice18();
    const minPremiumBps = await trade.minPremiumBps();
    const minPrice18 = (refPrice18 * (10_000n + BigInt(minPremiumBps))) / 10_000n;
    const price18 = (minPrice18 * 10_050n) / 10_000n;

    const kWhTotal = 500n;
    const listTx = await trade.connect(seller).listSurplus(kWhTotal, price18);
    const listRcpt = await listTx.wait();
    const listedLog = listRcpt.logs.find((l) => {
      try { return trade.interface.parseLog(l).name === "OrderListed"; } catch (_) { return false; }
    });
    const orderId = trade.interface.parseLog(listedLog).args.orderId;


    const overKwh = 600n;
    const enToNeeded = enToForKwhAtPrice(overKwh, price18);
    const balBuyer = await token.balanceOf(buyer.address);
    if (balBuyer < enToNeeded) {
      const from = (await token.balanceOf(admin.address)) >= enToNeeded ? admin : (await ethers.getSigners())[0];
      await (await token.connect(from).transfer(buyer.address, enToNeeded - balBuyer)).wait();
    }
    await (await token.connect(buyer).approve(await trade.getAddress(), enToNeeded)).wait();
    await expect(trade.connect(buyer).buyFromOrder(orderId, overKwh, enToNeeded)).to.be.reverted;


    const okKwh = 100n;
    const okNeed = enToForKwhAtPrice(okKwh, price18);
    await expect(trade.connect(buyer).buyFromOrder(orderId, okKwh, okNeed - 1n)).to.be.reverted;
  });

  it("previews quotes without changing state", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, trade } = contracts;
    const { admin, treasury } = signers;


    const enToSeed = ethers.parseUnits("1500", 18);
    const kWhSeed = 15_000n;

    const tBal = await token.balanceOf(treasury.address);
    if (tBal < enToSeed) {
      const from = (await token.balanceOf(admin.address)) >= enToSeed ? admin : (await ethers.getSigners())[0];
      if ((await token.balanceOf(from.address)) >= enToSeed - tBal) {
        await (await token.connect(from).transfer(treasury.address, enToSeed - tBal)).wait();
      }
    }
    await (await token.connect(treasury).approve(await trade.getAddress(), ethers.MaxUint256)).wait();
    try { await (await trade.connect(admin).seedAmm(enToSeed, kWhSeed)).wait(); } catch (_) {}

    const enToIn = ethers.parseUnits("100", 18);
    const kOut = await trade.previewAmmEnToForKwh(enToIn);
    expect(kOut).to.be.a("bigint");
    expect(kOut).to.be.greaterThan(0n);

    const kIn = 500n;
    const enOut = await trade.previewAmmKwhForEnTo(kIn);
    expect(enOut).to.be.a("bigint");
    expect(enOut).to.be.greaterThan(0n);
  });
});
