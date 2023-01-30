const sdk = require("@defillama/sdk");
const { graphQuery } = require("../helper/http");
const { getUniTVL } = require("../helper/unknownTokens");
const { sumTokens2 } = require('../helper/unwrapLPs')
const abi = require("./abi.json");

const chains = {
  ethereum: {
    graphId: "mainnet",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  arbitrum: {
    graphId: "arbitrum-one",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  polygon: {
    graphId: "matic",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  avax: {
    graphId: "avalanche",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  bsc: {
    graphId: "bsc",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  fantom: {
    graphId: "fantom",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  cronos: {
    graphId: "cronos",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  optimism: {
    graphId: "optimism",
    factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a"
  },
  aurora: { factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a" },
  velas: { factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a" },
  oasis: { factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a" },
  bittorrent: { factory: "0x5F1dddbf348aC2fbe22a163e30F99F9ECE3DD50a" },
};

async function fetchPools(chain) {
  const url =
    chain == "cronos"
      ? "https://cronos-graph.kyberengineering.io/subgraphs/name/kybernetwork/kyberswap-elastic-cronos"
      : `https://api.thegraph.com/subgraphs/name/kybernetwork/kyberswap-elastic-${chain}`;

  let length
  let lastId = ''
  let toa = [];
  const poolQuery = `
    query pools($lastId: String) {
      pools(first: 1000, where: {id_gt: $lastId} ) {
        id
        token0 {
          id
        }
        token1 {
          id
        }
      }
    }`;
  do {
    const {pools} = await graphQuery(url, poolQuery, { lastId })
    pools.forEach(({ id, token0, token1}) => {
      toa.push([token0.id, id])
      toa.push([token1.id, id])
    })
    lastId = pools[pools.length - 1].id
  } while (length === 1000)
  
  return toa;
}

function elastic(chain) {
  return async (_, block, chainBlocks) => {
    if (!("graphId" in chains[chain])) return {};

    block = chainBlocks[chain];
    const pools = await fetchPools(chains[chain].graphId);
    return sumTokens2({ chain, block, tokensAndOwners: pools })
  }
}
function classic(chain) {
  const factory = chains[chain].factory
  if (!factory) return {}
  return getUniTVL({ chain, factory: chains[chain].factory, abis: {
    allPairsLength: abi.allPoolsLength,
    allPairs: abi.allPools,
    getReserves: abi.getReserves,
  } })
}

module.exports = {
  timetravel: false,
};
Object.keys(chains).forEach(chain => {
  module.exports[chain] = {
    tvl: sdk.util.sumChainTvls([elastic(chain), classic(chain)])
  };
});
