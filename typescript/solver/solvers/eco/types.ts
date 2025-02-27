import z from "zod";
import { chainNames } from "../../config/index.js";
import { addressSchema } from "../../config/types.js";
import type { IntentCreatedEventObject } from "../../typechain/eco/contracts/IntentSource.js";
import { BaseMetadataSchema } from "../types.js";

export const EcoMetadataSchema = BaseMetadataSchema.extend({
  protocolName: z.string(),
  intentSources: z.array(
    z.object({
      address: addressSchema,
      chainName: z.string().refine((name) => chainNames.includes(name), {
        message: "Invalid chainName",
      }),
      pollInterval: z.number().optional(),
      confirmationBlocks: z.number().optional(),
      initialBlock: z.number().optional(),
      processedIds: z.array(z.string()).optional(),
    }),
  ),
  adapters: z.record(
    z.string().refine((name) => chainNames.includes(name), {
      message: "Invalid chainName",
    }),
    addressSchema,
  ),
  customRules: z
    .object({
      rules: z.array(
        z.object({
          name: z.string(),
          args: z.array(z.any()).optional(),
        }),
      ),
      keepBaseRules: z.boolean().optional(),
    })
    .optional(),
});

export type EcoMetadata = z.infer<typeof EcoMetadataSchema>;

export type IntentData = { adapterAddress: z.infer<typeof addressSchema> };

export type ParsedArgs = IntentCreatedEventObject & {
  orderId: string;
  senderAddress: IntentCreatedEventObject["_creator"];
  recipients: Array<{
    destinationChainName: string;
    recipientAddress: string;
  }>;
};
