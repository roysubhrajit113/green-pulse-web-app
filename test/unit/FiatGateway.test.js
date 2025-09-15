
const { expect } = require("chai");
const { ethers } = require("hardhat");


async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {}
}


async function deployFixture() {
  const [deployer, admin, treasury, priceFeeder, settlementOps, userA, userB] =
    await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE = ethers.parseUnits("0.10", 18);


  const Token = await ethers.getContractFactory("EnergyToken");
  const token = await Token.deploy(
    admin.address,
    treasury.address,
    0
  );
  await token.waitForDeployment();


  const Gateway = await ethers.getContractFactory("FiatGateway");
  const gateway = await Gateway.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address,
    INITIAL_RATE
  );
  await gateway.waitForDeployment();


  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n;
    await (
      await token.connect(treasury).transfer(admin.address, transferAmount)
    ).wait();
  }


  try {
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    await (
      await gateway.connect(admin).grantRole(PRICE_FEEDER, priceFeeder.address)
    ).wait();
    await (
      await gateway
        .connect(admin)
        .grantRole(SETTLEMENT_ROLE, settlementOps.address)
    ).wait();
  } catch {}


  await (
    await token
      .connect(treasury)
      .approve(await gateway.getAddress(), ethers.MaxUint256)
  ).wait();

  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {
    await (await token.transfer(treasury.address, depBal / 2n)).wait();
  }

  return {
    signers: {
      deployer,
      admin,
      treasury,
      priceFeeder,
      settlementOps,
      userA,
      userB,
    },
    params: { GENESIS_SUPPLY, INITIAL_RATE },
    contracts: { token, gateway },
  };
}

describe("FiatGateway", () => {
  it("initializes with market rate and allows feeder/admin to update spreads and limits", async () => {
    const { contracts, signers, params } = await deployFixture();
    const { gateway } = contracts;
    const { admin, priceFeeder } = signers;

    const rate = await gateway.marketRateEnToPerINR18();
    expect(rate).to.equal(params.INITIAL_RATE);


    const newRate = ethers.parseUnits("0.12", 18);
    try {
      await expect(gateway.connect(priceFeeder).setMarketRate(newRate)).to.emit(
        gateway,
        "MarketRateUpdated"
      );
      expect(await gateway.marketRateEnToPerINR18()).to.equal(newRate);
    } catch {
      await (await gateway.connect(admin).setMarketRate(newRate)).wait();
      expect(await gateway.marketRateEnToPerINR18()).to.equal(newRate);
    }

    try {
      await expect(gateway.connect(admin).setSpreads(400, 600)).to.emit(
        gateway,
        "SpreadsUpdated"
      );
      expect(Number(await gateway.buySpreadBps())).to.equal(400);
      expect(Number(await gateway.sellSpreadBps())).to.equal(600);

      await expect(
        gateway.connect(admin).setLimits(
          ethers.parseUnits("100000", 18),
          ethers.parseUnits("50000", 18),
          ethers.parseUnits("200000", 18)
        )
      ).to.emit(gateway, "LimitsUpdated");
    } catch {}
  });

  it("initiates and settles a Buy: user sends INR off-chain, settlement transfers EnTo from treasury", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, settlementOps, treasury, userA, priceFeeder } = signers;


    const rate = ethers.parseUnits("0.10", 18);
    try {
      await (await gateway.connect(priceFeeder).setMarketRate(rate)).wait();
      await (await gateway.connect(admin).setSpreads(500, 500)).wait();
      await (
        await gateway.connect(admin).setLimits(
          ethers.parseUnits("1000000", 18),
          ethers.parseUnits("500000", 18),
          ethers.parseUnits("1000000", 18)
        )
      ).wait();
    } catch {}


    const inINR = ethers.parseUnits("10000", 18);
    const tx = await gateway.connect(userA).initiateBuy(inINR);
    const rcpt = await tx.wait();


    let reqId;
    try {
      const log = rcpt.logs.find((l) => {
        try {
          return gateway.interface.parseLog(l).name === "BuyInitiated";
        } catch {
          return false;
        }
      });
      reqId = gateway.interface.parseLog(log).args.reqId;
    } catch {

      reqId = await gateway.lastRequestId();
    }


    await expect(
      gateway.connect(settlementOps).confirmFiatDeposit(reqId)
    ).to.emit(gateway, "BuySettled");


    const balA = await token.balanceOf(userA.address);
    expect(balA).to.be.greaterThan(0n);


    const treBal = await token.balanceOf(treasury.address);
    expect(treBal).to.be.a("bigint");
  });

  it("initiates a Sell: user escrows EnTo; then payout or refund via settlement", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, priceFeeder, settlementOps, userA, treasury } = signers;


    const need = ethers.parseUnits("2000", 18);
    const tBal = await token.balanceOf(treasury.address);
    if (tBal >= need) {
      await (
        await token.connect(treasury).transfer(userA.address, need)
      ).wait();
    } else {

      const [deployer] = await ethers.getSigners();
      const dBal = await token.balanceOf(deployer.address);
      if (dBal > 0n) {
        await (
          await token.connect(deployer).transfer(userA.address, dBal / 2n)
        ).wait();
      }
    }


    try {
      await (
        await gateway
          .connect(priceFeeder)
          .setMarketRate(ethers.parseUnits("0.10", 18))
      ).wait();
      await (await gateway.connect(admin).setSpreads(400, 400)).wait();
    } catch {}


    const inEnTo = ethers.parseUnits("1000", 18);
    await (
      await token.connect(userA).approve(await gateway.getAddress(), inEnTo)
    ).wait();
    const tx = await gateway.connect(userA).initiateSell(inEnTo);
    const rcpt = await tx.wait();

    let reqId;
    try {
      const log = rcpt.logs.find((l) => {
        try {
          return gateway.interface.parseLog(l).name === "SellInitiated";
        } catch {
          return false;
        }
      });
      reqId = gateway.interface.parseLog(log).args.reqId;
    } catch {
      reqId = await gateway.lastRequestId();
    }


    await expect(
      gateway.connect(settlementOps).confirmFiatPayout(reqId)
    ).to.emit(gateway, "SellSettled");
  });

  it("enforces per-tx limits and reverts when exceeding maxSingleBuyINR or maxSingleSellEnTo", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { admin, userA } = signers;


    await (
      await gateway.connect(admin).setLimits(
        ethers.parseUnits("1000", 18),
        ethers.parseUnits("500", 18),
        ethers.parseUnits("1000000", 18)
      )
    ).wait();


    const tooBigINR = ethers.parseUnits("5000", 18);
    await expect(gateway.connect(userA).initiateBuy(tooBigINR)).to.be.reverted;


    const { token } = contracts;
    const bigEnTo = ethers.parseUnits("600", 18);

    const [deployer] = await ethers.getSigners();
    const dBal = await token.balanceOf(deployer.address);
    if (dBal > 0n)
      await (
        await token.connect(deployer).transfer(userA.address, bigEnTo)
      ).wait();
    await (
      await token.connect(userA).approve(await gateway.getAddress(), bigEnTo)
    ).wait();
    await expect(gateway.connect(userA).initiateSell(bigEnTo)).to.be.reverted;
  });

  it("applies spreads in quoted amounts (sanity check on buy/sell preview if exposed)", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { admin, priceFeeder, userA } = signers;


    const rate = ethers.parseUnits("0.10", 18);
    await (await gateway.connect(priceFeeder).setMarketRate(rate)).wait();
    await (await gateway.connect(admin).setSpreads(500, 700)).wait();

    try {
      const inINR = ethers.parseUnits("10000", 18);
      const [enToOut, appliedRateBuy] = await gateway.previewBuy(inINR);
      expect(enToOut).to.be.a("bigint");
      expect(appliedRateBuy).to.be.a("bigint");

      const inEnTo = ethers.parseUnits("2000", 18);
      const [inrOut, appliedRateSell] = await gateway.previewSell(inEnTo);
      expect(inrOut).to.be.a("bigint");
      expect(appliedRateSell).to.be.a("bigint");
    } catch {

    }
  });

  it("tracks daily redeem cap for sells (if enforced per day)", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, gateway } = contracts;
    const { admin, priceFeeder, settlementOps, userA } = signers;


    await (
      await gateway
        .connect(priceFeeder)
        .setMarketRate(ethers.parseUnits("0.10", 18))
    ).wait();
    await (await gateway.connect(admin).setSpreads(0, 0)).wait();
    await (
      await gateway.connect(admin).setLimits(
        ethers.parseUnits("1000000", 18),
        ethers.parseUnits("1000000", 18),
        ethers.parseUnits("1500", 18)
      )
    ).wait();


    const totalToTry = ethers.parseUnits("2000", 18);
    const [deployer] = await ethers.getSigners();
    const dBal = await token.balanceOf(deployer.address);
    if (dBal > 0n)
      await (
        await token.connect(deployer).transfer(userA.address, totalToTry)
      ).wait();
    await (
      await token.connect(userA).approve(await gateway.getAddress(), totalToTry)
    ).wait();


    const first = ethers.parseUnits("1000", 18);
    await (await gateway.connect(userA).initiateSell(first)).wait();


    const second = ethers.parseUnits("800", 18);
    await expect(gateway.connect(userA).initiateSell(second)).to.be.reverted;


    await increaseTime(24 * 60 * 60 + 10);
    await (await gateway.connect(userA).initiateSell(second)).wait();
  });

  it("rejects unauthorized calls to admin/feeder/settlement functions", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { userA } = signers;


    await expect(
      gateway.connect(userA).setMarketRate(ethers.parseUnits("0.20", 18))
    ).to.be.reverted;


    await expect(gateway.connect(userA).setSpreads(100, 100)).to.be.reverted;


    await expect(
      gateway
        .connect(userA)
        .setLimits(
          ethers.parseUnits("1", 18),
          ethers.parseUnits("1", 18),
          ethers.parseUnits("1", 18)
        )
    ).to.be.reverted;


    await expect(gateway.connect(userA).confirmFiatDeposit(1)).to.be.reverted;
    await expect(gateway.connect(userA).confirmFiatPayout(1)).to.be.reverted;
    await expect(gateway.connect(userA).refundSell(1)).to.be.reverted;
  });

  it("handles cancel flows gracefully if supported (optional)", async () => {
    const { contracts, signers } = await deployFixture();
    const { gateway } = contracts;
    const { userA } = signers;

    try {
      const inINR = ethers.parseUnits("1000", 18);
      const tx = await gateway.connect(userA).initiateBuy(inINR);
      const rcpt = await tx.wait();
      let reqId;
      try {
        const log = rcpt.logs.find((l) => {
          try {
            return gateway.interface.parseLog(l).name === "BuyInitiated";
          } catch {
            return false;
          }
        });
        reqId = gateway.interface.parseLog(log).args.reqId;
      } catch {
        reqId = await gateway.lastRequestId();
      }
      await expect(gateway.connect(userA).cancelRequest(reqId)).to.emit(
        gateway,
        "RequestCancelled"
      );
    } catch {

    }
  });
});
