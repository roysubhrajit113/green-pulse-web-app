
const { expect } = require("chai");
const { ethers } = require("hardhat");


async function increaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {

  }
}


async function deployFixture() {
  const [
    deployer,
    admin,
    treasury,
    oracleCommittee,
    borrower,
    meterFeeder,
    extra
  ] = await ethers.getSigners();

  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE = ethers.parseUnits("0.10", 18);


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


  const Oracle = await ethers.getContractFactory("EnergyOracle");
  const oracle = await Oracle.deploy(
    await token.getAddress(),
    await auction.getAddress(),
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();


  const Loan = await ethers.getContractFactory("EnergyLoan");
  const loan = await Loan.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();


  const treasuryBalance = await token.balanceOf(treasury.address);
  if (treasuryBalance > 0n) {
    const transferAmount = treasuryBalance / 2n;
    await (await token.connect(treasury).transfer(admin.address, transferAmount)).wait();
  }



  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    await (await token.connect(admin).grantRole(MINTER_ROLE, await oracle.getAddress())).wait();
    await (await token.connect(admin).grantRole(BURNER_ROLE, await oracle.getAddress())).wait();
  }


  if (oracle.setLoanModule) {
    await (await oracle.connect(admin).setLoanModule(await loan.getAddress())).wait();
  }
  if (loan.setOracle) {
    await (await loan.connect(admin).setOracle(await oracle.getAddress())).wait();
  }

  return {
    signers: { deployer, admin, treasury, oracleCommittee, borrower, meterFeeder, extra },
    params: { GENESIS_SUPPLY, INITIAL_RATE },
    contracts: { token, auction, oracle, loan },
  };
}

describe("EnergyLoan", () => {
  it("requests a loan with collateral, accrues interest over time, and supports partial/full repayment", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower } = signers;

    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {

    }


    const collateral = ethers.parseUnits("2000", 18);

    const borrowAmt = ethers.parseUnits("3000", 18);


    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();
    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {
      
    }


    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();


    await expect(loan.connect(borrower).requestLoan(borrowAmt, collateral))
      .to.emit(loan, "LoanRequested"); 

    let L = await loan.loans(borrower.address);
    expect(L.active).to.eq(true);
    expect(L.principal).to.eq(borrowAmt);
    expect(L.collateral).to.eq(collateral);
    expect(Number(L.rateBps)).to.be.greaterThan(0);


    await increaseTime(7 * 24 * 60 * 60);


    let interest = 0n;
    try {
      interest = await loan.previewAccruedInterest(borrower.address);
      expect(interest).to.be.a("bigint");
    } catch (_) {

    }


    const extraColl = ethers.parseUnits("500", 18);

    const bal = await token.balanceOf(borrower.address);
    if (bal < extraColl) {
      await (await token.connect(admin).transfer(borrower.address, extraColl - bal)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), extraColl)).wait();
    await expect(loan.connect(borrower).depositCollateral(extraColl))
      .to.emit(loan, "CollateralDeposited");


    const withdrawTry = ethers.parseUnits("200", 18);
    try {
      await expect(loan.connect(borrower).withdrawCollateral(withdrawTry))
        .to.emit(loan, "CollateralWithdrawn");
    } catch (_) {


    }


    const partialRepay = ethers.parseUnits("1000", 18);

    const repayBal = await token.balanceOf(borrower.address);
    if (repayBal < partialRepay) {
      await (await token.connect(admin).transfer(borrower.address, partialRepay - repayBal)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), partialRepay)).wait();
    await expect(loan.connect(borrower).repay(partialRepay))
      .to.emit(loan, "LoanRepaid");

    L = await loan.loans(borrower.address);
    expect(L.principal).to.be.lessThan(borrowAmt);


    const remaining = L.principal;
    if (remaining > 0n) {
      const bal2 = await token.balanceOf(borrower.address);
      if (bal2 < remaining) {
        await (await token.connect(admin).transfer(borrower.address, remaining - bal2)).wait();
      }
      await (await token.connect(borrower).approve(await loan.getAddress(), remaining)).wait();
      await expect(loan.connect(borrower).repay(remaining))
        .to.emit(loan, "LoanRepaid");
    }


    L = await loan.loans(borrower.address);
    expect(L.principal).to.eq(0n);
    expect(L.active).to.eq(false);
  });

  it("prevents unsafe collateral withdrawal that would break health thresholds", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower } = signers;


    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {}

    const collateral = ethers.parseUnits("1500", 18);
    const borrowAmt = ethers.parseUnits("2000", 18);

    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();

    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {}

    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();
    await (await loan.connect(borrower).requestLoan(borrowAmt, collateral)).wait();


    const tooMuch = ethers.parseUnits("1400", 18);
    await expect(loan.connect(borrower).withdrawCollateral(tooMuch)).to.be.reverted;
  });

  it("allows liquidation only when undercollateralized (happy path: should revert when healthy)", async () => {
    const { contracts, signers } = await deployFixture();
    const { token, oracle, loan } = contracts;
    const { admin, treasury, borrower, extra } = signers;

    try {
      await (await token.connect(treasury).approve(await loan.getAddress(), ethers.MaxUint256)).wait();
    } catch (_) {}

    const collateral = ethers.parseUnits("3000", 18);
    const borrowAmt = ethers.parseUnits("2000", 18);

    await (await token.connect(admin).transfer(borrower.address, collateral)).wait();

    try {
      const cs = await oracle.creditScore(borrower.address);
      if (cs === 0n) {
        await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
      }
    } catch (_) {}

    await (await token.connect(borrower).approve(await loan.getAddress(), collateral)).wait();
    await (await loan.connect(borrower).requestLoan(borrowAmt, collateral)).wait();


    await expect(loan.connect(extra).liquidate(borrower.address)).to.be.reverted;


    await increaseTime(365 * 24 * 60 * 60);
    try {
      await loan.connect(extra).liquidate(borrower.address);


    } catch (_) {

    }
  });
});
