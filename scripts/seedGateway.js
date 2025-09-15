











const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

function loadAddresses() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}. Run scripts/deploy.js first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function main() {
  const addrs = loadAddresses();
  const A = addrs.addresses || {};
  const R = addrs.roles || {};

  const signers = await ethers.getSigners();

  const deployer = signers;
  const admin = signers[1] || deployer;
  const treasury = signers || deployer;

  if (!A.EnergyToken || !A.FiatGateway) {
    throw new Error("Missing EnergyToken or FiatGateway address in deployments file.");
  }

  console.log(`Network: ${network.name}`);
  console.log(`Admin:    ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);

  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const gateway = await ethers.getContractAt("FiatGateway", A.FiatGateway);


  const gatewayAddr = await gateway.getAddress();
  const allowance = await token.allowance(treasury.address, gatewayAddr);
  if (allowance < ethers.parseUnits("1000000", 18)) {
    console.log("Approving FiatGateway to transfer EnTo from Treasury...");
    const txA = await token.connect(treasury).approve(gatewayAddr, ethers.MaxUint256);
    await txA.wait();
    console.log("Approved.");
  } else {
    console.log("Sufficient allowance already set. Skipping approval.");
  }



















  const rateNow = await gateway.marketRateEnToPerINR18();
  const buyBps = await gateway.buySpreadBps();
  const sellBps = await gateway.sellSpreadBps();
  const maxBuyINR = await gateway.maxSingleBuyINR();
  const maxSellEnTo = await gateway.maxSingleSellEnTo();
  const dailyCap = await gateway.dailyRedeemCapEnTo();

  console.log("FiatGateway config:", {
    marketRateEnToPerINR18: rateNow.toString(),
    buySpreadBps: Number(buyBps),
    sellSpreadBps: Number(sellBps),
    maxSingleBuyINR: maxBuyINR.toString(),
    maxSingleSellEnTo: maxSellEnTo.toString(),
    dailyRedeemCapEnTo: dailyCap.toString()
  });

  console.log("seedGateway complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
