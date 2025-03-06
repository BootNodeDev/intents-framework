import { AddressZero } from "@ethersproject/constants";

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

    // testnet
    {
      address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      chainName: "optimismsepolia",
    },
    {
      address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      chainName: "arbitrumsepolia",
    },
    {
      address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      chainName: "sepolia",
    },
    {
      address: "0xf614c6bF94b022E16BEF7dBecF7614FFD2b201d3",
      chainName: "basesepolia",
      initialBlock: 21491220,
      pollInterval: 1000,
      confirmationBlocks: 2,
    },
  ],
  customRules: {
    rules: [
      {
        name: "filterByTokenAndAmount",
        args: {
          "11155420": {
            "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(50e18),
            [AddressZero]: BigInt(5e15),
          },
          "84532": {
            "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(50e18),
            [AddressZero]: BigInt(5e15),
          },
          "421614": {
            "0xaf88d065e77c8cC2239327C5EDb3A432268e5831": null,
            [AddressZero]: BigInt(5e15),
          },
          "11155111": {
            "0x5f94BC7Fb4A2779fef010F96b496cD36A909E818": BigInt(5e18),
            [AddressZero]: BigInt(5e10),
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
