import { type CompactXMetadata, CompactXMetadataSchema } from "../types.js";

const metadata: CompactXMetadata = {
  protocolName: "CompactX",
  intentSources: {
    webSockets: [
      {
        url: "ws://localhost:3000/ws",
        // url: "wss://compactx-disseminator.com/ws",
      },
    ],
  },
  chainInfo: {
    1: {
      arbiter: "0xDfd41e6E2e08e752f464084F5C11619A3c950237",
      tribunal: "0xDfd41e6E2e08e752f464084F5C11619A3c950237",
      compactX: "0x00000000000018DF021Ff2467dF97ff846E09f48",
      prefix:
        "0x1901afbd5f3d34c216b31ba8b82d0b32ae91e4edea92dd5bbf4c1ad028f72364a211",
      priorityFee: 1n,
      tokens: {
        ETH: {
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
          symbol: "ETH",
          coingeckoId: "ethereum",
        },
        WETH: {
          address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          decimals: 18,
          symbol: "WETH",
          coingeckoId: "weth",
        },
        USDC: {
          address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
          decimals: 6,
          symbol: "USDC",
          coingeckoId: "usd-coin",
        },
      },
    },
    10: {
      arbiter: "0x2602D9f66ec17F2dc770063F7B91821DD741F626",
      tribunal: "0x2602D9f66ec17F2dc770063F7B91821DD741F626",
      compactX: "0x00000000000018DF021Ff2467dF97ff846E09f48",
      prefix:
        "0x1901ea25de9c16847077fe9d95916c29598dc64f4850ba02c5dbe7800d2e2ecb338e",
      priorityFee: 1n,
      tokens: {
        ETH: {
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
          symbol: "ETH",
          coingeckoId: "ethereum",
        },
        WETH: {
          address: "0x4200000000000000000000000000000000000006",
          decimals: 18,
          symbol: "WETH",
          coingeckoId: "weth",
        },
        USDC: {
          address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
          decimals: 6,
          symbol: "USDC",
          coingeckoId: "usd-coin",
        },
      },
    },
    130: {
      arbiter: "0x81fC1d90C5fae0f15FC91B5592177B594011C576",
      tribunal: "0x81fC1d90C5fae0f15FC91B5592177B594011C576",
      compactX: "0x00000000000018DF021Ff2467dF97ff846E09f48",
      prefix:
        "0x190150e2b173e1ac2eac4e4995e45458f4cd549c256c423a041bf17d0c0a4a736d2c",
      priorityFee: 1n,
      tokens: {
        ETH: {
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
          symbol: "ETH",
          coingeckoId: "ethereum",
        },
        WETH: {
          address: "0x4200000000000000000000000000000000000006",
          decimals: 18,
          symbol: "WETH",
          coingeckoId: "weth",
        },
        USDC: {
          address: "0x078d782b760474a361dda0af3839290b0ef57ad6",
          decimals: 6,
          symbol: "USDC",
          coingeckoId: "usd-coin",
        },
      },
    },
    8453: {
      arbiter: "0xfaBE453252ca8337b091ba01BB168030E2FE6c1F",
      tribunal: "0xfaBE453252ca8337b091ba01BB168030E2FE6c1F",
      compactX: "0x00000000000018DF021Ff2467dF97ff846E09f48",
      prefix:
        "0x1901a1324f3bfe91ee592367ae7552e9348145e65b410335d72e4507dcedeb41bf52",
      priorityFee: 50n,
      tokens: {
        ETH: {
          address: "0x0000000000000000000000000000000000000000",
          decimals: 18,
          symbol: "ETH",
          coingeckoId: "ethereum",
        },
        WETH: {
          address: "0x4200000000000000000000000000000000000006",
          decimals: 18,
          symbol: "WETH",
          coingeckoId: "weth",
        },
        USDC: {
          address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          decimals: 6,
          symbol: "USDC",
          coingeckoId: "usd-coin",
        },
      },
    },
  },
  allocators: {
    AUTOCATOR: {
      id: "1730150456036417775412616585",
      signingAddress: "0x4491fB95F2d51416688D4862f0cAeFE5281Fa3d9",
      url: "https://autocator.org",
    },
    SMALLOCATOR: {
      id: "1223867955028248789127899354",
      signingAddress: "0x51044301738Ba2a27bd9332510565eBE9F03546b",
      url: "https://smallocator.xyz",
    },
  },
  customRules: {
    rules: [
      {
        name: "validateChainsAndTokens",
      },
      {
        name: "verifySignatures",
      },
      {
        name: "checkExpirations",
      },
      {
        name: "validateArbiterAndTribunal",
      },
      {
        name: "verifyNonce",
      },
    ],
  },
};

export default CompactXMetadataSchema.parse(metadata);
