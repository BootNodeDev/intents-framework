import z from "zod";
import { chainNames } from "../../config/index.js";
import { addressSchema } from "../../config/types.js";
import type { IntentCreatedEventObject } from "../../typechain/eco/contracts/IntentSource.js";

export const EcoMetadataSchema = z.object({
  protocolName: z.string(),
  intentSources: z.array(
    z.object({
      address: addressSchema,
      chainName: z.string().refine((name) => chainNames.includes(name), {
        message: "Invalid chainName",
      }),
    }),
  ),
  adapters: z.array(
    z.object({
      address: addressSchema,
      chainName: z.string().refine((name) => chainNames.includes(name), {
        message: "Invalid chainName",
      }),
    }),
  ),
  customRules: z.object({
    rules: z.array(
      z.object({
        name: z.string(),
        args: z.array(z.any()).optional()
      })
    ),
    keepBaseRules: z.boolean().optional()
  }).optional()
});

export type EcoMetadata = z.infer<typeof EcoMetadataSchema>;

export type IntentData = { adapter: EcoMetadata["adapters"][number] };

export type ParsedArgs = IntentCreatedEventObject & {
  orderId: string;
  senderAddress: IntentCreatedEventObject["_creator"];
  recipients: Array<{
    destinationChainName: string;
    recipientAddress: string;
  }>;
};
