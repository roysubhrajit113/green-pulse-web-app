



















const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");


function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const key = a.replace(/^--/, "");
      const next = args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
      if (next !== true) i++;
      flags[key] = next;
    }
  }
  return flags;
}

function loadDeployments() {
  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Deployments file not found at ${file}. Run your deploy script first.`);
  }
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function showInfo(addrs) {
  const A = addrs.addresses;
  const R = addrs.roles || {};

  console.log("Addresses:");
  console.table(A);
  console.log("Known role holders (from deployments file):");
  console.table(R);


  try {
    const oracle = await ethers.getContractAt("EnergyOracle", A.EnergyOracle);
    const ORACLE_ROLE = await oracle.ORACLE_ROLE();

    for (const who of [R.oracleCommittee, R.admin].filter(Boolean)) {
      const has = await oracle.hasRole(ORACLE_ROLE, who);
      console.log(`EnergyOracle.ORACLE_ROLE(${who}) = ${has}`);
    }
  } catch {

  }

  try {
    const gateway = await ethers.getContractAt("FiatGateway", A.FiatGateway);
    const PRICE_FEEDER = await gateway.PRICE_FEEDER();
    const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();
    for (const who of [R.priceFeeder, R.settlement].filter(Boolean)) {
      const isFeeder = await gateway.hasRole(PRICE_FEEDER, who);
      const isSettl = await gateway.hasRole(SETTLEMENT_ROLE, who);
      console.log(`FiatGateway: priceFeeder? ${who}=${isFeeder}, settlement?=${isSettl}`);
    }
  } catch {

  }
}

async function grantOracleRoles(addrs, opts) {
  const A = addrs.addresses;
  const oracle = await ethers.getContractAt("EnergyOracle", A.EnergyOracle);
  const adminSigner = (await ethers.getSigners())[1] || (await ethers.getSigners())[0];

  const ORACLE_ROLE = await oracle.ORACLE_ROLE();

  if (!opts.feeder) {
    throw new Error("Missing --feeder <address> for ORACLE_ROLE grant.");
  }
  const feeder = opts.feeder;
  console.log(`Granting EnergyOracle.ORACLE_ROLE to feeder: ${feeder}`);
  await (await oracle.connect(adminSigner).grantRole(ORACLE_ROLE, feeder)).wait();

  if (opts.meter) {
    console.log(`Setting meter signer: ${opts.meter}`);
    await (await oracle.connect(adminSigner).setMeterSigner(opts.meter, true)).wait();
  }

  console.log("Oracle roles configured.");
}

async function grantTokenRolesForOracle(addrs) {
  const A = addrs.addresses;
  const R = addrs.roles || {};
  const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
  const adminSigner = (await ethers.getSigners())[1] || (await ethers.getSigners())[0];

  if (!token.MINTER_ROLE || !token.BURNER_ROLE) {
    throw new Error("EnergyToken does not expose MINTER_ROLE/BURNER_ROLE. Adjust this script for your token.");
  }
  const MINTER_ROLE = await token.MINTER_ROLE();
  const BURNER_ROLE = await token.BURNER_ROLE();
  const oracleAddr = A.EnergyOracle;

  console.log(`Granting MINTER_ROLE and BURNER_ROLE on EnergyToken to EnergyOracle: ${oracleAddr}`);
  await (await token.connect(adminSigner).grantRole(MINTER_ROLE, oracleAddr)).wait();
  await (await token.connect(adminSigner).grantRole(BURNER_ROLE, oracleAddr)).wait();


  if (token.TREASURY_ROLE && R.treasury) {
    const TREASURY_ROLE = await token.TREASURY_ROLE();
    const has = await token.hasRole(TREASURY_ROLE, R.treasury);
    if (!has) {
      console.log(`Granting TREASURY_ROLE to treasury: ${R.treasury}`);
      await (await token.connect(adminSigner).grantRole(TREASURY_ROLE, R.treasury)).wait();
    }
  }

  console.log("Token roles configured for Oracle.");
}

async function gatewayRoles(addrs, opts) {
  const A = addrs.addresses;
  const gateway = await ethers.getContractAt("FiatGateway", A.FiatGateway);
  const adminSigner = (await ethers.getSigners())[1] || (await ethers.getSigners())[0];

  const PRICE_FEEDER = await gateway.PRICE_FEEDER();
  const SETTLEMENT_ROLE = await gateway.SETTLEMENT_ROLE();

  if (!opts.feeder || !opts.settlement) {
    throw new Error("Provide both --feeder <address> and --settlement <address> for gateway roles.");
  }

  console.log(`Granting PRICE_FEEDER to ${opts.feeder}`);
  await (await gateway.connect(adminSigner).grantRole(PRICE_FEEDER, opts.feeder)).wait();

  console.log(`Granting SETTLEMENT_ROLE to ${opts.settlement}`);
  await (await gateway.connect(adminSigner).grantRole(SETTLEMENT_ROLE, opts.settlement)).wait();

  console.log("Gateway roles configured.");
}

async function rotateTreasury(addrs, opts) {
  const A = addrs.addresses;
  const gateway = await ethers.getContractAt("FiatGateway", A.FiatGateway);
  const adminSigner = (await ethers.getSigners())[1] || (await ethers.getSigners())[0];

  if (!opts["new-treasury"]) {
    throw new Error("Missing --new-treasury <address> for treasury rotation.");
  }


  console.log(`Rotating FiatGateway treasury to ${opts["new-treasury"]}`);
  await (await gateway.connect(adminSigner).setTreasury(opts["new-treasury"])).wait();


  try {
    const token = await ethers.getContractAt("EnergyToken", A.EnergyToken);
    if (token.TREASURY_ROLE) {
      const TREASURY_ROLE = await token.TREASURY_ROLE();


      const hasNew = await token.hasRole(TREASURY_ROLE, opts["new-treasury"]);
      if (!hasNew) {
        await (await token.connect(adminSigner).grantRole(TREASURY_ROLE, opts["new-treasury"])).wait();
        console.log("Granted token TREASURY_ROLE to new treasury.");
      }
    }
  } catch {

  }


  const file = path.join(__dirname, "..", "deploy", "deployments", `${network.name}.json`);
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.roles = json.roles || {};
  json.roles.treasury = opts["new-treasury"];
  fs.writeFileSync(file, JSON.stringify(json, null, 2));
  console.log(`Updated deployments file treasury to ${opts["new-treasury"]}`);
}

async function main() {
  const args = parseArgs();
  const addrs = loadDeployments();

  if (args.show) {
    await showInfo(addrs);
    return;
  }

  if (args["grant-oracle"]) {
    await grantOracleRoles(addrs, args);
  }

  if (args["token-roles-for-oracle"]) {
    await grantTokenRolesForOracle(addrs);
  }

  if (args["gateway-roles"]) {
    await gatewayRoles(addrs, args);
  }

  if (args["rotate-treasury"]) {
    await rotateTreasury(addrs, args);
  }

  if (!args["grant-oracle"] && !args["token-roles-for-oracle"] && !args["gateway-roles"] && !args["rotate-treasury"]) {
    console.log("No operation specified. Use one of:");
    console.log("  --show");
    console.log("  --grant-oracle --feeder <ADDR> [--meter <ADDR>]");
    console.log("  --token-roles-for-oracle");
    console.log("  --gateway-roles --feeder <ADDR> --settlement <ADDR>");
    console.log("  --rotate-treasury --new-treasury <ADDR>");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
