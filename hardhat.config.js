require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");


module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  defaultNetwork: "localhost",
  networks: {
    localhost: {
      url: process.env.RPC_URL_LOCAL || "http://127.0.0.1:8545",

    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  mocha: {
    timeout: 120000,
  },
};