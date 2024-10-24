import type { Event } from "@ethersproject/contracts";
import type { ChainId } from "@hyperlane-xyz/utils";

export interface Output {
  token: string;
  amount: string;
  recipient: string;
  chainId: string;
}

export interface FillInstruction {
  destinationChainId: string;
  destinationSettler: string;
  originData: string;
}

export interface ResolvedCrossChainOrder {
  maxSpent: Array<Output>;
  minReceived: Array<Output>;
  fillInstructions: Array<FillInstruction>;
}

export interface OpenEventArgs {
  orderId: string;
  resolvedOrder: ResolvedCrossChainOrder;
}

export interface OpenEvent extends Omit<Event, 'args'> {
  args: OpenEventArgs
}

export type OriginSettlerInfo = {
  address: string;
  chainId: ChainId;
}