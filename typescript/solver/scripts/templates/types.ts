export const typesTemplate = (name: string, className: string) => `
import z from 'zod';
import { BaseMetadataSchema, BaseIntentData } from '../types.js';
import type { ParsedArgs as BaseParsedArgs } from '../BaseFiller.js';

export const ${className}MetadataSchema = BaseMetadataSchema.extend({
  // Add any additional metadata fields here if needed
});

export type ${className}Metadata = z.infer<typeof ${className}MetadataSchema>;

export interface IntentData extends BaseIntentData {
  // Add your intent data fields here
}

export interface ParsedArgs extends BaseParsedArgs {
  orderId: string;
  senderAddress: string;
  recipients: Array<{
    destinationChainName: string;
    recipientAddress: string;
  }>;
  // Add any additional parsed args fields here
}
`;
