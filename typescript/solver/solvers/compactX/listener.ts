import { chainIdsToName } from "../../config/index.js";
import type { BaseWebSocketSource } from "../types.js";
import { WebSocketListener } from "../WebSocketListener.js";
import { metadata } from "./config/index.js";
import { BroadcastRequestSchema, type CompactXParsedArgs } from "./types.js";
import { log } from "./utils.js";

type CompactXClassMetadata = {
  webSocket: BaseWebSocketSource;
  protocolName: string;
};

export class CompactXListener extends WebSocketListener<CompactXParsedArgs> {
  constructor(metadata: CompactXClassMetadata) {
    super(metadata, log);
  }

  protected parseEventArgs(args: Buffer): CompactXParsedArgs {
    const context: CompactXParsedArgs["context"] = BroadcastRequestSchema.parse(
      JSON.parse(args.toString()),
    );

    return {
      orderId: context.compact.id,
      senderAddress: context.compact.sponsor,
      recipients: [
        {
          destinationChainName: chainIdsToName[context.compact.mandate.chainId],
          recipientAddress: context.compact.mandate.recipient,
        },
      ],
      context,
    };
  }
}

export const create = () => {
  const { intentSources, protocolName } = metadata;
  const _metadata = {
    webSocket: intentSources.webSockets[0],
    protocolName,
  };
  return new CompactXListener(_metadata).create();
};
