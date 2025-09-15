











const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  const signers = await ethers.getSigners();

  const deployer = signers[0];
  const admin = signers[1] || deployer;
  const treasury = signers[2] || deployer;
  const oracleCommittee = signers[3] || admin;
  const priceFeeder = signers[4] || admin;
  const settlement = signers[5] || admin;
  const executor = signers[6] || admin;

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);
  console.log(`OracleCommittee: ${oracleCommittee.address}`);
  console.log(`PriceFeeder: ${priceFeeder.address}`);
  console.log(`Settlement: ${settlement.address}`);
  console.log(`Executor: ${executor.address}`);



  const GENESIS_SUPPLY = ethers.parseUnits("100000", 18);
  const INITIAL_MARKET_RATE_EN_TO_PER_INR = ethers.parseUnits("0.10", 18);




  const TokenFactory = await ethers.getContractFactory("EnergyToken", deployer);
  const token = await TokenFactory.deploy(
    admin.address,
    treasury.address,
    0
  );
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log("EnergyToken:", tokenAddr);



  const AuctionFactory = await ethers.getContractFactory(
    "EnergyAuction",
    deployer
  );
  const auction = await AuctionFactory.deploy(
    tokenAddr,
    GENESIS_SUPPLY,
    admin.address,
    oracleCommittee.address
  );
  await auction.waitForDeployment();
  const auctionAddr = await auction.getAddress();
  console.log("EnergyAuction:", auctionAddr);



  const OracleFactory = await ethers.getContractFactory(
    "EnergyOracle",
    deployer
  );
  const oracle = await OracleFactory.deploy(
    tokenAddr,
    auctionAddr,
    GENESIS_SUPPLY,
    admin.address
  );
  await oracle.waitForDeployment();
  const oracleAddr = await oracle.getAddress();
  console.log("EnergyOracle:", oracleAddr);



  const TradeFactory = await ethers.getContractFactory("EnergyTrade", deployer);
  const trade = await TradeFactory.deploy(
    tokenAddr,
    GENESIS_SUPPLY,
    admin.address,
    treasury.address
  );
  await trade.waitForDeployment();
  const tradeAddr = await trade.getAddress();
  console.log("EnergyTrade:", tradeAddr);



  const LoanFactory = await ethers.getContractFactory("EnergyLoan", deployer);
  const loan = await LoanFactory.deploy(
    tokenAddr,
    admin.address,
    treasury.address
  );
  await loan.waitForDeployment();
  const loanAddr = await loan.getAddress();
  console.log("EnergyLoan:", loanAddr);



  const GatewayFactory = await ethers.getContractFactory(
    "FiatGateway",
    deployer
  );
  const gateway = await GatewayFactory.deploy(
    tokenAddr,
    admin.address,
    treasury.address,
    INITIAL_MARKET_RATE_EN_TO_PER_INR
  );
  await gateway.waitForDeployment();
  const gatewayAddr = await gateway.getAddress();
  console.log("FiatGateway:", gatewayAddr);



  const GovFactory = await ethers.getContractFactory("GovStaking", deployer);
  const gov = await GovFactory.deploy(
    tokenAddr,
    admin.address,
    executor.address
  );
  await gov.waitForDeployment();
  const govAddr = await gov.getAddress();
  console.log("GovStaking:", govAddr);






  if (token.MINTER_ROLE && token.BURNER_ROLE) {
    const MINTER_ROLE = await token.MINTER_ROLE();
    const BURNER_ROLE = await token.BURNER_ROLE();
    const tx1 = await token.connect(admin).grantRole(MINTER_ROLE, oracleAddr);
    await tx1.wait();
    const tx2 = await token.connect(admin).grantRole(BURNER_ROLE, oracleAddr);
    await tx2.wait();
    console.log(
      "Granted MINTER and BURNER roles on EnergyToken to EnergyOracle"
    );
  } else {
    console.warn(
      "EnergyToken roles not found (MINTER_ROLE/BURNER_ROLE). Skipping role grants."
    );
  }

  const tx3 = await oracle.connect(admin).setLoanModule(loanAddr);
  await tx3.wait();
  console.log("Oracle linked to Loan module");



  if (gateway.PRICE_FEEDER && gateway.SETTLEMENT_ROLE) {
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    const tx4 = await gateway
      .connect(admin)
      .grantRole(PRICE_FEEDER, priceFeeder.address);
    await tx4.wait();
    const tx5 = await gateway
      .connect(admin)
      .grantRole(SETTLEMENT_ROLE, settlement.address);
    await tx5.wait();
    console.log("Granted PRICE_FEEDER and SETTLEMENT_ROLE on FiatGateway");
  } else {
    console.warn(
      "FiatGateway role getters not found. Skipping feeder/settlement grants."
    );
  }


  if (loan.setOracle) {
    const tx6 = await loan.connect(admin).setOracle(oracleAddr);
    await tx6.wait();
    console.log("Loan linked to Oracle for credit scores");
  }







  try {
    const approveTx = await (
      await ethers.getContractAt("EnergyToken", tokenAddr, treasury)
    ).approve(gatewayAddr, ethers.MaxUint256);
    await approveTx.wait();
    console.log("Treasury approved FiatGateway for EnTo transfers");
  } catch (e) {
    console.warn(
      "Treasury approval for FiatGateway failed or skipped:",
      e?.message
    );
  }




  const out = {
    network: network.name,
    addresses: {
      EnergyToken: tokenAddr,
      EnergyAuction: auctionAddr,
      EnergyOracle: oracleAddr,
      EnergyTrade: tradeAddr,
      EnergyLoan: loanAddr,
      FiatGateway: gatewayAddr,
      GovStaking: govAddr,
    },
    roles: {
      admin: admin.address,
      treasury: treasury.address,
      oracleCommittee: oracleCommittee.address,
      priceFeeder: priceFeeder.address,
      settlement: settlement.address,
      executor: executor.address,
    },
    params: {
      genesisSupply: GENESIS_SUPPLY.toString(),
      initialRateEnToPerINR18: INITIAL_MARKET_RATE_EN_TO_PER_INR.toString(),
    },
    timestamp: Date.now(),
  };

  const dir = path.join(__dirname, "..", "deploy", "deployments");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Deployment saved to ${file}`);


  console.log("\nDeployed addresses:");
  console.table(out.addresses);
  console.log("Role holders:");
  console.table(out.roles);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
