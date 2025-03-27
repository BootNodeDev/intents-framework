import { chainIdsToName } from "../../config/index.js";
import { ServerSentEventListener } from "../ServerSentEventListener.js";
import { metadata } from "./config/index.js";
import type { Hyperlane7683Metadata, OpenEventArgs } from "./types.js";
import { log } from "./utils.js";

type Hyperlane7683SSEMetadata = {
  sse: Hyperlane7683Metadata["intentSources"]["sse"][number];
  protocolName: Hyperlane7683Metadata["protocolName"];
};

type OpenEvent = Omit<OpenEventArgs, 'senderAddress' | 'recipients'>;

export class Hyperlane7683SSEListener extends ServerSentEventListener<
  OpenEvent,
  OpenEventArgs
> {
  constructor(metadata: Hyperlane7683SSEMetadata) {
    super(metadata, log);
  }

  protected override parseEventArgs(
    args: OpenEvent,
  ) {
    const { orderId, resolvedOrder } = args;
    return {
      orderId,
      senderAddress: resolvedOrder.user,
      recipients: resolvedOrder.maxSpent.map(({ chainId, recipient }) => ({
        destinationChainName: chainIdsToName[chainId.toString()],
        recipientAddress: recipient,
      })),
      resolvedOrder,
    };
  }
}

export const create = async () => {
  const { intentSources, protocolName } = metadata;

  const _metadata = {
    sse: intentSources.sse[0],
    protocolName,
  }

  return new Hyperlane7683SSEListener(_metadata).create();
};
