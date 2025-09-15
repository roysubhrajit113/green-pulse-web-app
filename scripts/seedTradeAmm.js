














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


  const deployer = signers[0];
  const admin = signers[1] || deployer;
  const treasury = signers[2] || deployer;

  console.log(`Network: ${network.name}`);
  console.log(`Admin:    ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);

  if (!A.EnergyToken || !A.EnergyTrade) {
    throw new Error("Missing EnergyToken or EnergyTrade address in deployments file.");
  }

  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const trade = await ethers.getContractAt("EnergyTrade", A.EnergyTrade);



  const enToAmount = ethers.parseUnits("5000", 18);
  const kWhAmount = 50_000n;


  const treasBal = await token.balanceOf(treasury.address);
  if (treasBal < enToAmount) {
    throw new Error(`Treasury lacks EnTo. Need ${ethers.formatUnits(enToAmount, 18)}, have ${ethers.formatUnits(treasBal, 18)}.`);
  }


  const tradeAddr = await trade.getAddress();
  const allowance = await token.allowance(treasury.address, tradeAddr);
  if (allowance < enToAmount) {
    console.log("Approving EnergyTrade to spend Treasury EnTo...");
    const txA = await token.connect(treasury).approve(tradeAddr, ethers.MaxUint256);
    await txA.wait();
  }


  console.log(`Seeding AMM with ${ethers.formatUnits(enToAmount, 18)} EnTo and ${kWhAmount.toString()} kWh...`);
  const txSeed = await trade.connect(admin).seedAmm(enToAmount, kWhAmount);
  const rcptSeed = await txSeed.wait();
  console.log("AMM seeded. Gas used:", rcptSeed.gasUsed?.toString());


  try {
    const refPrice18 = await trade.previewRefPrice18();
    console.log("Ref price (kWh per EnTo, 1e18):", refPrice18.toString());

    const testEnToIn = ethers.parseUnits("100", 18);
    const kOut = await trade.previewAmmEnToForKwh(testEnToIn);
    console.log(`Preview AMM quote: ${ethers.formatUnits(testEnToIn, 18)} EnTo -> ${kOut.toString()} kWh`);
  } catch (e) {
    console.log("Preview calls failed (pool may not be fully initialized or contract reverted).");
  }

  console.log("seedTradeAmm complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
