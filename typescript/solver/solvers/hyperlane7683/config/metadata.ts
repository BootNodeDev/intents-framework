import {
  type Hyperlane7683Metadata,
  Hyperlane7683MetadataSchema,
} from "../types.js";

const metadata: Hyperlane7683Metadata = {
  protocolName: "Hyperlane7683",
  intentSources: [
    // mainnet
    // {
    //   address: "0x5F69f9aeEB44e713fBFBeb136d712b22ce49eb88",
    //   chainName: "ethereum",
    // },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "optimism",
    // },
    {
      address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
      chainName: "arbitrum",
      pollInterval: 3000,
      confirmationBlocks: 80,
    },
    {
      address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
      chainName: "base",
      pollInterval: 3000,
      confirmationBlocks: 10,
    },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "gnosis",
    // },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "berachain",
    // },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "form",
    // },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "unichain",
    // },
    // {
    //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
    //   chainName: "artela",
    // },

    // testnet
    // {
    //   address: "0x6d2175B89315A9EB6c7eA71fDE54Ac0f294aDC34",
    //   chainName: "optimismsepolia",
    // },
    // {
    //   address: "0x6d2175B89315A9EB6c7eA71fDE54Ac0f294aDC34",
    //   chainName: "arbitrumsepolia",
    // },
    // {
    //   address: "0x6d2175B89315A9EB6c7eA71fDE54Ac0f294aDC34",
    //   chainName: "sepolia",
    // },
    // {
    //   address: "0x6d2175B89315A9EB6c7eA71fDE54Ac0f294aDC34",
    //   chainName: "basesepolia",
    // },
    // {
    //   address: "0x6d2175B89315A9EB6c7eA71fDE54Ac0f294aDC34",
    //   chainName: "basesepolia",
    //   initialBlock: 21491220,
    //   pollInterval: 1000,
    //   confirmationBlocks: 2,
    // },
  ],
  customRules: {
    rules: [
      {
        name: "filterByTokenAndAmount",
        args: [
          {
            // "1": ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
            // "10": ["0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"],
            "42161": ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831"],
            "8453": ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"],
            // "100": ["0x2a22f9c3b484c3629090feed35f17ff8f88f76f0"],
            // "80094": ["0x549943e04f40284185054145c6E4e9568C1D3241"],
            // "478": ["0xFBf489bb4783D4B1B2e7D07ba39873Fb8068507D"],
            // "130": ["0x078D782b760474a361dDA0AF3839290b0EF57AD6"],
            // "11820": ["0x8d9Bd7E9ec3cd799a659EE650DfF6C799309fA91"],
          },
          BigInt(50e6)
        ]
      },
      {
        name: "intentNotFilled"
      }
    ]
  }
};

Hyperlane7683MetadataSchema.parse(metadata);

export default metadata;
