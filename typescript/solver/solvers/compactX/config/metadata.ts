import { type CompactXMetadata, CompactXMetadataSchema } from "../types.js";

const metadata: CompactXMetadata = {
  protocolName: "CompactX",
  intentSources: [
    // TODO: redefine the intent source, as it's an endpoint
  ],
};

CompactXMetadataSchema.parse(metadata);

export default metadata;
