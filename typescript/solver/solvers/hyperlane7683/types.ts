import type { BigNumber } from "ethers";
import z from "zod";

import type { OpenEventObject } from "../../typechain/hyperlane7683/contracts/Hyperlane7683.js";
import {
  BaseBlockchainEventSourceSchema,
  BaseMetadataSchema,
} from "../types.js";

export type ExtractStruct<T, K extends object> = T extends (infer U & K)[]
  ? U[]
  : never;

export type ResolvedCrossChainOrder = Omit<
  OpenEventObject["resolvedOrder"],
  "minReceived" | "maxSpent" | "fillInstructions"
> & {
  minReceived: ExtractStruct<
    OpenEventObject["resolvedOrder"]["minReceived"],
    { token: string }
  >;
  maxSpent: ExtractStruct<
    OpenEventObject["resolvedOrder"]["maxSpent"],
    { token: string }
  >;
  fillInstructions: ExtractStruct<
    OpenEventObject["resolvedOrder"]["fillInstructions"],
    { destinationChainId: BigNumber }
  >;
};

export interface OpenEventArgs {
  orderId: string;
  senderAddress: ResolvedCrossChainOrder["user"];
  recipients: Array<{
    destinationChainName: string;
    recipientAddress: string;
  }>;
  resolvedOrder: ResolvedCrossChainOrder;
}

export type IntentData = {
  fillInstructions: ResolvedCrossChainOrder["fillInstructions"];
  maxSpent: ResolvedCrossChainOrder["maxSpent"];
};

export const Hyperlane7683MetadataSchema = BaseMetadataSchema.extend({
  intentSources: z
    .object({
      blockchainEvents: z.array(BaseBlockchainEventSourceSchema),
    })
    .strict(),
});

export type Hyperlane7683Metadata = z.infer<typeof Hyperlane7683MetadataSchema>;
