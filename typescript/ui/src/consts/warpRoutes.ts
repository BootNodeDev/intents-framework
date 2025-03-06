import { type WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { zeroAddress } from 'viem';

const ROUTER = '0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3';
const ITT = '0x5f94BC7Fb4A2779fef010F96b496cD36A909E818';

const NETWORK_SEPARATOR = '101010';

export const TOP_MAX = {
  'bsesepolia': {
    [ITT]: 100e18,
    [zeroAddress]: 1e16,
  },
  'optimismsepolia': {
    [ITT]: 100e18,
    [zeroAddress]: 1e16,
  },
  'arbitrumsepolia': {
    [ITT]: 100e18,
    [zeroAddress]: 1e16,
  },
  'sepolia': {
    [ITT]: 100e18,
    [zeroAddress]: 1e16,
  },
}

// A list of Warp Route token configs
// These configs will be merged with the warp routes in the configured registry
// The input here is typically the output of the Hyperlane CLI warp deploy command
export const warpRouteConfigs: WarpCoreConfig = {
  tokens: [
    {
      addressOrDenom: ITT,
      chainName: 'optimismsepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|basesepolia|' + ITT,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + ITT,
        },
        {
          token: 'ethereum|sepolia|' + ITT,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ITT',
      standard: 'Intent',
      symbol: 'ITT',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: ITT,
      chainName: 'basesepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + ITT,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + ITT,
        },
        {
          token: 'ethereum|sepolia|' + ITT,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ITT',
      standard: 'Intent',
      symbol: 'ITT',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: ITT,
      chainName: 'arbitrumsepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + ITT,
        },
        {
          token: 'ethereum|basesepolia|' + ITT,
        },
        {
          token: 'ethereum|sepolia|' + ITT,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ITT',
      standard: 'Intent',
      symbol: 'ITT',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: ITT,
      chainName: 'sepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + ITT,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + ITT,
        },
        {
          token: 'ethereum|basesepolia|' + ITT,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ITT',
      standard: 'Intent',
      symbol: 'ITT',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: zeroAddress,
      chainName: 'optimismsepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|basesepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|sepolia|' + zeroAddress,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ETH',
      standard: 'IntentNative',
      symbol: 'ETH',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: zeroAddress,
      chainName: 'basesepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|sepolia|' + zeroAddress,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ETH',
      standard: 'IntentNative',
      symbol: 'ETH',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: zeroAddress,
      chainName: 'arbitrumsepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|basesepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|sepolia|' + zeroAddress,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ETH',
      standard: 'IntentNative',
      symbol: 'ETH',
      protocol: 'ethereum',
    },
    {
      addressOrDenom: zeroAddress,
      chainName: 'sepolia',
      collateralAddressOrDenom: ROUTER,
      connections: [
        {
          token: 'ethereum|optimismsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|arbitrumsepolia|' + zeroAddress,
        },
        {
          token: 'ethereum|basesepolia|' + zeroAddress,
        },
      ],
      decimals: 18,
      logoURI: '/deployments/warp_routes/ETH/logo.svg',
      name: 'ETH',
      standard: 'IntentNative',
      symbol: 'ETH',
      protocol: 'ethereum',
    },
  ],
  // Mainnet Op Arb Base Bera Form
  options: {
    interchainFeeConstants: [
      {
        amount: 3e14,
        origin: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia'].join(NETWORK_SEPARATOR),
        destination: 'sepolia',
        addressOrDenom: zeroAddress,
      },
      {
        amount: 75e16,
        origin: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia'].join(NETWORK_SEPARATOR),
        destination: 'sepolia',
        addressOrDenom: ITT,
      },
      {
        amount: 1e10,
        origin: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia', 'sepolia'].join(
          NETWORK_SEPARATOR,
        ),
        destination: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia'].join(NETWORK_SEPARATOR),
        addressOrDenom: zeroAddress,
      },
      {
        amount: 5e16,
        origin: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia', 'sepolia'].join(
          NETWORK_SEPARATOR,
        ),
        destination: ['optimismsepolia', 'basesepolia', 'arbitrumsepolia'].join(NETWORK_SEPARATOR),
        addressOrDenom: ITT,
      },
    ],
  },
};
