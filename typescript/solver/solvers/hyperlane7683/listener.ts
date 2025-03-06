import { chainIdsToName } from "../../config/index.js";
import type { TypedListener } from "../../typechain/common.js";
import { Hyperlane7683__factory } from "../../typechain/factories/hyperlane7683/contracts/Hyperlane7683__factory.js";
import type {
  Hyperlane7683,
  OpenEvent,
} from "../../typechain/hyperlane7683/contracts/Hyperlane7683.js";
import { BaseListener } from "../BaseListener.js";
import { metadata } from "./config/index.js";
import type { OpenEventArgs, Hyperlane7683Metadata } from "./types.js";
import { log } from "./utils.js";
import { getLastIndexedBlocks } from "./db.js";

export class Hyperlane7683Listener extends BaseListener<
  Hyperlane7683,
  OpenEvent,
  OpenEventArgs
> {
  constructor(metadata: Hyperlane7683Metadata) {
    const { intentSources, protocolName } = metadata;
    const hyperlane7683Metadata = { contracts: intentSources, protocolName };

    super(Hyperlane7683__factory, "Open", hyperlane7683Metadata, log);
  }

  protected override parseEventArgs(
    args: Parameters<TypedListener<OpenEvent>>,
  ) {
    const [orderId, resolvedOrder] = args;
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
  const { intentSources } = metadata;
  const blocksByChain = await getLastIndexedBlocks();

  metadata.intentSources = intentSources.map((intentSource) => {
    const chainBlockNumber =
      blocksByChain[intentSource.chainName]?.blockNumber;

    if (
      chainBlockNumber &&
      chainBlockNumber >= (intentSource.initialBlock ?? 0)
    ) {
      return {
        ...intentSource,
        initialBlock: blocksByChain[intentSource.chainName].blockNumber,
        processedIds: blocksByChain[intentSource.chainName].processedIds,
      };
    }
    return intentSource;
  });

  return new Hyperlane7683Listener(metadata).create();
};
