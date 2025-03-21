export const metadataTemplate = (name: string, contractAddress: string, chainName: string) => `
import { BaseMetadataSchema } from '../../types.js';

// TODO: Update with actual contract address and chain name before using in production
const metadata = {
  protocolName: '${name}',
  intentSources: [
    {
      address: '${contractAddress}',
      chainName: '${chainName}',
    }
  ]
};

BaseMetadataSchema.parse(metadata);
export default metadata;
`;
