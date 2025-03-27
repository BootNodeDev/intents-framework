import {
  type Hyperlane7683Metadata,
  Hyperlane7683MetadataSchema,
} from "../types.js";

const metadata: Hyperlane7683Metadata = {
  protocolName: "Hyperlane7683",
  intentSources: {
    blockchainEvents: [
      // mainnet
      // {
      //   address: "0x5F69f9aeEB44e713fBFBeb136d712b22ce49eb88",
      //   chainName: "ethereum",
      // },
      // {
      //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
      //   chainName: "optimism",
      // },
      // {
      //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
      //   chainName: "arbitrum",
      // },
      // {
      //   address: "0x9245A985d2055CeA7576B293Da8649bb6C5af9D0",
      //   chainName: "base",
      // },
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
      // testnet
      // {
      //   address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      //   chainName: "optimismsepolia",
      // },
      // {
      //   address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      //   chainName: "arbitrumsepolia",
      // },
      // {
      //   address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      //   chainName: "sepolia",
      // },
      // {
      //   address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      //   chainName: "basesepolia",
      //   initialBlock: 21491220,
      //   pollInterval: 1000,
      //   confirmationBlocks: 2,
      // },
    ],
  },
  customRules: {
    rules: [
      {
        name: "filterByTokenAndAmount",
        args: {
          "42161": {
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": BigInt(50e6),
          },
          "8453": {
            "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913": BigInt(50e6),
          },
        },
      },
      {
        name: "intentNotFilled",
      },
    ],
  },
};

Hyperlane7683MetadataSchema.parse(metadata);

export default metadata;
