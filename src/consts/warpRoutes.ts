import { type WarpCoreConfig } from '@hyperlane-xyz/sdk';
import { zeroAddress } from 'viem';

// const ROUTER = '0x376dc8e71a223af488d885ce04a7021f32c2d1e0';
const ROUTER = '0xe0c8f83bA0686FDF1a76AF0cC202181AEaA25a03';
const ITT = '0x5f94BC7Fb4A2779fef010F96b496cD36A909E818';

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
  options: {},
};
