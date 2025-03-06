import z from "zod";
import { chainNames } from "../../config/index.js";
import { addressSchema } from "../../config/types.js";
import type { IntentCreatedEventObject } from "../../typechain/eco/contracts/IntentSource.js";
import { BaseMetadataSchema } from "../types.js";

export const EcoMetadataSchema = BaseMetadataSchema.extend({
  adapters: z.record(
    z.string().refine((name) => chainNames.includes(name), {
      message: "Invalid chainName",
    }),
    addressSchema,
  ),
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
