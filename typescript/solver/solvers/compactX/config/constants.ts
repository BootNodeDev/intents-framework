export const SUPPORTED_CHAINS = [1, 10, 130, 8453] as const; // Mainnet, Optimism, Unichain, & Base
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number];

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
