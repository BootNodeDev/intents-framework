import { type EcoMetadata, EcoMetadataSchema } from "../types.js";

const metadata: EcoMetadata = {
  protocolName: "Eco",
  intentSources: [
    {
      address: "0x734a3d5a8D691d9b911674E682De5f06517c79ec",
      chainName: "optimismsepolia",
    },
  ],
  adapters: {
    basesepolia: "0x218FB5210d4eE248f046F3EC8B5Dd1c7Bc0756e5",
  },
};

EcoMetadataSchema.parse(metadata);

export default metadata;
