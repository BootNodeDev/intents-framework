import type { ParsedArgs } from "../BaseFiller";
import type { BaseWebSocketSource } from "../types.js";
import { WebSocketListener } from "../WebSocketListener";
import { type BroadcastRequest } from "./types.js";
import { log } from "./utils.js";

type CompactXClassMetadata = {
  webSocket: BaseWebSocketSource;
  protocolName: string;
};

type Args = ParsedArgs & { context: BroadcastRequest };

export class CompactXListener extends WebSocketListener<Args> {
  constructor(metadata: CompactXClassMetadata) {
    super(metadata, log);
  }

  protected parseEventArgs(args: Buffer): Args {
    const parsedArgs: Args["context"] = JSON.parse(args.toString());
    return {
      context: parsedArgs,
      orderId: "",
      senderAddress: "",
      recipients: [],
    };
  }
}
