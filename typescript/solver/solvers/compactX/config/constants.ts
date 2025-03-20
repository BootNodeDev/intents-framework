import { Address } from "@hyperlane-xyz/utils";

export const SUPPORTED_CHAINS = [1, 10, 130, 8453] as const; // Mainnet, Optimism, Unichain, & Base
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number];

export interface TokenConfig {
  address: Address;
  decimals: number;
  symbol: string;
  coingeckoId: string;
}

export interface ChainConfig {
  name: string;
  nativeToken: string;
  coingeckoId: string;
  blockExplorer: string;
  rpcEnvKey: string;
  tokens: Record<string, TokenConfig>;
}

export const CHAIN_PRIORITY_FEES: Record<SupportedChainId, bigint> = {
  1: 1n, // Mainnet
  10: 1n, // Optimism
  130: 1n, // Unichain
  8453: 50n, // Base
} as const;

// Supported addresses for arbiters and tribunals per chain
export const SUPPORTED_ARBITER_ADDRESSES: Record<SupportedChainId, string> = {
  1: "0xDfd41e6E2e08e752f464084F5C11619A3c950237", // Ethereum
  10: "0x2602D9f66ec17F2dc770063F7B91821DD741F626", // Optimism
  130: "0x81fC1d90C5fae0f15FC91B5592177B594011C576", // Unichain
  8453: "0xfaBE453252ca8337b091ba01BB168030E2FE6c1F", // Base
} as const;

export const SUPPORTED_TRIBUNAL_ADDRESSES = SUPPORTED_ARBITER_ADDRESSES;

/**
 * Configuration for allocators used in signature verification
 */
export const ALLOCATORS = {
  AUTOCATOR: {
    id: "1730150456036417775412616585",
    signingAddress: "0x4491fB95F2d51416688D4862f0cAeFE5281Fa3d9", // used to verify signatures from server
    url: "https://autocator.org",
  },
  SMALLOCATOR: {
    id: "1223867955028248789127899354",
    signingAddress: "0x51044301738Ba2a27bd9332510565eBE9F03546b",
    url: "https://smallocator.xyz",
  },
} as const;

export const CHAIN_CONFIG: Record<SupportedChainId, ChainConfig> = {
  1: {
    name: "Mainnet",
    nativeToken: "ETH",
    coingeckoId: "ethereum",
    blockExplorer: "https://etherscan.io",
    rpcEnvKey: "RPC_URL_MAINNET",
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
    name: "Optimism",
    nativeToken: "ETH",
    coingeckoId: "ethereum",
    blockExplorer: "https://optimistic.etherscan.io",
    rpcEnvKey: "RPC_URL_OPTIMISM",
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
    name: "Unichain",
    nativeToken: "ETH",
    coingeckoId: "unichain",
    blockExplorer: "https://uniscan.xyz",
    rpcEnvKey: "RPC_URL_UNICHAIN",
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
    name: "Base",
    nativeToken: "ETH",
    coingeckoId: "ethereum",
    blockExplorer: "https://basescan.org",
    rpcEnvKey: "RPC_URL_BASE",
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
} as const;
