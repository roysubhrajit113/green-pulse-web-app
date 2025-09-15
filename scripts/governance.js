















const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");


async function loadAddresses() {
  const file = path.join(
    __dirname,
    "..",
    "deploy",
    "deployments",
    `${network.name}.json`
  );
  if (!fs.existsSync(file)) {
    throw new Error(
      `Deployments file not found: ${file}. Run scripts/deploy.js first.`
    );
  }
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  return json;
}

async function increaseTime(seconds) {

  try {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  } catch (e) {}
}

async function mineBlocks(count) {
  try {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine");
    }
  } catch (e) {

  }
}


function key(name) {
  return ethers.id(name);
}

async function main() {
  const addrs = await loadAddresses();
  const addresses = addrs.addresses;

  const [deployer, admin, voter1, voter2, executorMaybe] =
    await ethers.getSigners();

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Admin: ${admin.address}`);
  console.log(`Voter1: ${voter1.address}`);
  console.log(`Voter2: ${voter2.address}`);


  const token = await ethers.getContractAt(
    "EnergyToken",
    addresses.EnergyToken
  );
  const gov = await ethers.getContractAt("GovStaking", addresses.GovStaking);


  const votingDelay = await gov.votingDelay();
  const votingPeriod = await gov.votingPeriod();
  const executionDelay = await gov.executionDelay();
  console.log("Gov params:", {
    votingDelay: Number(votingDelay),
    votingPeriod: Number(votingPeriod),
    executionDelay: Number(executionDelay),
  });


  const stakeAmt = ethers.parseUnits("1000", 18);
  const v1Bal = await token.balanceOf(voter1.address);
  const v2Bal = await token.balanceOf(voter2.address);

  if (v1Bal < stakeAmt) {

    const from =
      (await token.balanceOf(admin.address)) >= stakeAmt ? admin : deployer;
    console.log(`Funding voter1 from ${from.address}`);
    await (await token.connect(from).transfer(voter1.address, stakeAmt)).wait();
  }
  if (v2Bal < stakeAmt) {
    const from =
      (await token.balanceOf(admin.address)) >= stakeAmt ? admin : deployer;
    console.log(`Funding voter2 from ${from.address}`);
    await (await token.connect(from).transfer(voter2.address, stakeAmt)).wait();
  }


  await (
    await token.connect(voter1).approve(await gov.getAddress(), stakeAmt)
  ).wait();
  await (await gov.connect(voter1).stake(stakeAmt)).wait();
  console.log("Voter1 staked:", ethers.formatUnits(stakeAmt, 18));

  await (
    await token.connect(voter2).approve(await gov.getAddress(), stakeAmt)
  ).wait();
  await (await gov.connect(voter2).stake(stakeAmt)).wait();
  console.log("Voter2 staked:", ethers.formatUnits(stakeAmt, 18));



  const paramKey = key("BURN_RATE");
  const newValue = ethers.parseUnits("0.09", 18);
  const description = "Update Oracle burn rate to 0.09 EnTo per kWh (example)";

  const proposeTx = await gov
    .connect(voter1)
    .propose(paramKey, newValue, description);
  const proposeRcpt = await proposeTx.wait();

  const createdEvent = proposeRcpt.logs.find((l) => {
    try {
      const parsed = gov.interface.parseLog(l);
      return parsed && parsed.name === "ProposalCreated";
    } catch (e) {
      return false;
    }
  });

  if (!createdEvent) {
    throw new Error("ProposalCreated event not found");
  }

  const parsed = gov.interface.parseLog(createdEvent);
  const proposalId = parsed.args.id;
  console.log("Created proposal:", proposalId.toString());


  if (Number(votingDelay) > 0) {
    console.log(
      `Advancing ${Number(votingDelay)} blocks to reach voting start...`
    );
    await mineBlocks(Number(votingDelay));
  }



  await (await gov.connect(voter1).castVote(proposalId, 1)).wait();
  console.log("Voter1 voted FOR");

  await (await gov.connect(voter2).castVote(proposalId, 1)).wait();
  console.log("Voter2 voted FOR");


  console.log(`Advancing ${Number(votingPeriod)} blocks to end voting...`);
  await mineBlocks(Number(votingPeriod) + 1);


  await (await gov.queue(proposalId)).wait();
  console.log("Proposal queued");


  console.log(
    `Advancing time by ${Number(executionDelay)} seconds to reach ETA...`
  );
  await increaseTime(Number(executionDelay) + 1);

  await (await gov.connect(admin).execute(proposalId)).wait();
  console.log("Proposal executed");


  const p = await gov.proposals(proposalId);
  console.log("Final proposal state:", {
    proposer: p.proposer,
    paramKey: p.paramKey,
    newValue: p.newValue.toString(),
    startBlock: Number(p.startBlock),
    endBlock: Number(p.endBlock),
    forVotes: p.forVotes.toString(),
    againstVotes: p.againstVotes.toString(),
    abstainVotes: p.abstainVotes.toString(),
    eta: Number(p.eta),
    state: await (async () => {

      return "Executed";
    })(),
  });

  console.log("Governance flow complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
