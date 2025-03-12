import { type CompactXMetadata, CompactXMetadataSchema } from "../types.js";

const metadata: CompactXMetadata = {
  protocolName: "CompactX",
  intentSources: {
    webSockets: [
      {
        url: "ws://localhost:8080",
      },
    ],
  },
};

CompactXMetadataSchema.parse(metadata);

export default metadata;
