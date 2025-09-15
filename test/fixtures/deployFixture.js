
const { ethers } = require("hardhat");


async function tryGrantRole(contract, roleName, grantee, admin) {
  try {
    const role = await contract[roleName]();
    const has = await contract.hasRole(role, grantee);
    if (!has) {
      await (await contract.connect(admin).grantRole(role, grantee)).wait();
    }
    return true;
  } catch {
    return false;
  }
}

async function trySet(contract, fnName, args, signer) {
  try {
    await (await contract.connect(signer)[fnName](...args)).wait();
    return true;
  } catch {
    return false;
  }
}

async function approveMax(token, owner, spender) {
  try {
    await (await token.connect(owner).approve(spender, ethers.MaxUint256)).wait();
    return true;
  } catch {
    return false;
  }
}

async function deployFixture() {

  const [
    deployer,
    admin,
    treasury,
    oracleCommittee,
    priceFeeder,
    settlement,
    executor,
    deptA,
    deptB,
    meterFeeder,
    borrower,
    seller,
    buyer,
    extra
  ] = await ethers.getSigners();


  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_RATE_EN_TO_PER_INR_18 = ethers.parseUnits("0.10", 18);


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


  const Trade = await ethers.getContractFactory("EnergyTrade");
  const trade = await Trade.deploy(
    await token.getAddress(),
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();


  const Loan = await ethers.getContractFactory("EnergyLoan");
  const loan = await Loan.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();


  const Gateway = await ethers.getContractFactory("FiatGateway");
  const gateway = await Gateway.deploy(
    await token.getAddress(),
    admin.address,
    treasury.address,
    INITIAL_RATE_EN_TO_PER_INR_18
  );
  await gateway.waitForDeployment();


  const Gov = await ethers.getContractFactory("GovStaking");
  const gov = await Gov.deploy(
    await token.getAddress(),
    admin.address,
    executor.address
  );
  await gov.waitForDeployment();




  await tryGrantRole(token, "MINTER_ROLE", await oracle.getAddress(), admin);
  await tryGrantRole(token, "BURNER_ROLE", await oracle.getAddress(), admin);


  await trySet(oracle, "setLoanModule", [await loan.getAddress()], admin);
  await trySet(loan, "setOracle", [await oracle.getAddress()], admin);


  await tryGrantRole(oracle, "ORACLE_ROLE", oracleCommittee.address, admin);

  await trySet(oracle, "setMeterSigner", [meterFeeder.address, true], admin);


  await tryGrantRole(gateway, "PRICE_FEEDER", priceFeeder.address, admin);
  await tryGrantRole(gateway, "SETTLEMENT_ROLE", settlement.address, admin);


  await approveMax(token, treasury, await gateway.getAddress());
  await approveMax(token, treasury, await trade.getAddress());
  await approveMax(token, treasury, await loan.getAddress());



  const depBal = await token.balanceOf(deployer.address);
  if (depBal > 0n) {

    const toTreasury = depBal / 2n;
    if (toTreasury > 0n) {
      await (await token.connect(deployer).transfer(treasury.address, toTreasury)).wait();
    }
  }


  async function fund(address, amount) {
    const bal = await token.balanceOf(address);
    if (bal < amount) {
      const shortfall = amount - bal;

      const dep = await token.balanceOf(deployer.address);
      if (dep >= shortfall) {
        await (await token.connect(deployer).transfer(address, shortfall)).wait();
      } else {
        const tre = await token.balanceOf(treasury.address);
        if (tre >= shortfall) {
          await (await token.connect(treasury).transfer(address, shortfall)).wait();
        } else if (tre > 0n) {
          await (await token.connect(treasury).transfer(address, tre)).wait();
        }
      }
    }
  }


  await trySet(gateway, "setMarketRate", [INITIAL_RATE_EN_TO_PER_INR_18], priceFeeder);
  await trySet(gateway, "setSpreads", [500, 500], admin);
  await trySet(
    gateway,
    "setLimits",
    [
      ethers.parseUnits("1000000", 18),
      ethers.parseUnits("500000", 18),
      ethers.parseUnits("1000000", 18)
    ],
    admin
  );


  async function seedTradeAmm(enToAmount, kWhAmount) {
    await fund(treasury.address, enToAmount);
    await approveMax(token, treasury, await trade.getAddress());
    try {
      await (await trade.connect(admin).seedAmm(enToAmount, kWhAmount)).wait();
    } catch {

    }
  }

  function enToForKwh(kWh, unitPrice18) {
    return (kWh * 10n ** 18n) / unitPrice18;
  }

  return {

    signers: {
      deployer,
      admin,
      treasury,
      oracleCommittee,
      priceFeeder,
      settlement,
      executor,
      deptA,
      deptB,
      meterFeeder,
      borrower,
      seller,
      buyer,
      extra
    },

    params: {
      GENESIS_SUPPLY,
      INITIAL_RATE_EN_TO_PER_INR_18
    },

    contracts: {
      token,
      auction,
      oracle,
      trade,
      loan,
      gateway,
      gov
    },

    utils: {
      tryGrantRole,
      trySet,
      approveMax,
      fund,
      seedTradeAmm,
      enToForKwh
    }
  };
}

module.exports = { deployFixture };
