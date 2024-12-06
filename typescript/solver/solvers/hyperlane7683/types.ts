import type { BigNumber } from "ethers";
import type { OpenEventObject } from "../../typechain/hyperlane7683/contracts/Hyperlane7683.js";

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
  resolvedOrder: ResolvedCrossChainOrder;
}

export type IntentData = {
  fillInstructions: ResolvedCrossChainOrder["fillInstructions"];
  maxSpent: ResolvedCrossChainOrder["maxSpent"];
};

export type Hyperlane7683Metadata = {
  protocolName: string;
  originSettler: {
    address: string;
    chainId: number;
    chainName?: string;
  };
};
