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
};

CompactXMetadataSchema.parse(metadata);

export default metadata;
