


















const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function loadAddresses() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found: ${file}. Run scripts/deploy.js first.`);
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json;
}

async function tryIncreaseTime(seconds) {
  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (_) {

  }
}

async function main() {
  const addrs = await loadAddresses();
  const A = addrs.addresses;

  const [deployer, admin, treasury, borrower, extra] = await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Treasury: ${treasury.address}`);
  console.log(`Borrower: ${borrower.address}`);


  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const loan = await ethers.getContractAt("EnergyLoan", A.EnergyLoan);
  const oracle = await ethers.getContractAt("EnergyOracle", A.EnergyOracle);


  const collateralAmt = ethers.parseUnits("2000", 18);
  const borrowAmt = ethers.parseUnits("3000", 18);
  const partialRepay = ethers.parseUnits("1000", 18);







  const borrowerBal = await token.balanceOf(borrower.address);
  if (borrowerBal < collateralAmt) {

    const from = (await token.balanceOf(admin.address)) >= collateralAmt ? admin : deployer;
    console.log(`Funding borrower with collateral from ${from.address}`);
    await (await token.connect(from).transfer(borrower.address, collateralAmt)).wait();
  }



  const cs = await oracle.creditScore(borrower.address).catch(() => 0n);
  if (!cs || cs === 0n) {

    await (await oracle.connect(admin).setCreditScore(borrower.address, 60)).wait();
    console.log("Set borrower credit score to 60 via Oracle.");
  }


  await (await token.connect(borrower).approve(await loan.getAddress(), collateralAmt)).wait();
  console.log("Borrower approved Loan contract to pull collateral.");



  await (await loan.connect(borrower).requestLoan(borrowAmt, collateralAmt)).wait();
  console.log(`Loan requested: ${ethers.formatUnits(borrowAmt, 18)} EnTo with ${ethers.formatUnits(collateralAmt, 18)} collateral.`);


  let L = await loan.loans(borrower.address);
  console.log("Loan state after funding:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });


  await tryIncreaseTime(7 * 24 * 60 * 60);
  const interestPreview = await loan.previewAccruedInterest(borrower.address);
  console.log("Preview interest after ~7 days:", ethers.formatUnits(interestPreview, 18));


  const extraColl = ethers.parseUnits("500", 18);

  if ((await token.balanceOf(borrower.address)) < extraColl) {
    const from = (await token.balanceOf(admin.address)) >= extraColl ? admin : deployer;
    await (await token.connect(from).transfer(borrower.address, extraColl)).wait();
  }
  await (await token.connect(borrower).approve(await loan.getAddress(), extraColl)).wait();
  await (await loan.connect(borrower).depositCollateral(extraColl)).wait();
  console.log(`Deposited extra collateral: ${ethers.formatUnits(extraColl, 18)}`);


  try {
    const withdrawAmt = ethers.parseUnits("300", 18);
    await (await loan.connect(borrower).withdrawCollateral(withdrawAmt)).wait();
    console.log(`Withdrew collateral: ${ethers.formatUnits(withdrawAmt, 18)}`);
  } catch (e) {
    console.log("Collateral withdraw blocked by health checks (as expected if unsafe).");
  }



  await (await token.connect(borrower).approve(await loan.getAddress(), partialRepay)).wait();
  await (await loan.connect(borrower).repay(partialRepay)).wait();
  console.log(`Partial repayment: ${ethers.formatUnits(partialRepay, 18)}`);


  L = await loan.loans(borrower.address);
  console.log("Loan state after partial repay:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });


  const principalNow = L.principal;
  if (principalNow > 0n) {

    const needed = principalNow;
    const bal = await token.balanceOf(borrower.address);
    if (bal < needed) {
      const topUp = needed - bal;
      const from = (await token.balanceOf(admin.address)) >= topUp ? admin : deployer;
      await (await token.connect(from).transfer(borrower.address, topUp)).wait();
    }
    await (await token.connect(borrower).approve(await loan.getAddress(), needed)).wait();
    await (await loan.connect(borrower).repay(needed)).wait();
    console.log(`Fully repaid: ${ethers.formatUnits(needed, 18)} EnTo`);
  }


  L = await loan.loans(borrower.address);
  console.log("Loan state after full repay:", {
    principal: ethers.formatUnits(L.principal, 18),
    collateral: ethers.formatUnits(L.collateral, 18),
    rateBps: Number(L.rateBps),
    active: L.active,
  });

















  console.log("Loan demo complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
