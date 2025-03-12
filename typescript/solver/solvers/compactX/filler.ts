import { type MultiProvider } from "@hyperlane-xyz/sdk";
import { type Result } from "@hyperlane-xyz/utils";

import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import { allowBlockLists, metadata } from "./config/index.js";
import type { CompactXMetadata, CompactXParsedArgs } from "./types.js";
import { log } from "./utils.js";

export type CompactXRule = CompactXFiller["rules"][number];

export class CompactXFiller extends BaseFiller<
  CompactXMetadata,
  CompactXParsedArgs,
  {}
> {
  constructor(multiProvider: MultiProvider, rules?: BuildRules<CompactXRule>) {
    super(multiProvider, allowBlockLists, metadata, log, rules);
  }

  protected retrieveOriginInfo(
    parsedArgs: CompactXParsedArgs,
    chainName: string,
  ) {
    return Promise.reject("Method not implemented.");
  }

  protected retrieveTargetInfo(parsedArgs: CompactXParsedArgs) {
    return Promise.reject("Method not implemented.");
  }

  protected async prepareIntent(
    parsedArgs: CompactXParsedArgs,
  ): Promise<Result<{}>> {
    try {
      await super.prepareIntent(parsedArgs);

      return { data: {}, success: true };
    } catch (error: any) {
      return {
        error: error.message ?? "Failed to prepare Eco Intent.",
        success: false,
      };
    }
  }

  protected async fill(
    parsedArgs: CompactXParsedArgs,
    data: any,
    originChainName: string,
  ) {
    this.log.info({
      msg: "Filling Intent",
      intent: `no se`,
    });

    this.log.debug({
      msg: "Approving tokens",
      protocolName: this.metadata.protocolName,
      intentHash: "no se",
      adapterAddress: data.adapterAddress,
    });

    this.log.info({
      msg: "Filled Intent",
      intent: `${this.metadata.protocolName}-${""}`,
      txDetails: "",
      txHash: "",
    });
  }
}

const enoughBalanceOnDestination: CompactXRule = async (
  parsedArgs,
  context,
) => {
  // const erc20Interface = Erc20__factory.createInterface();

  // const requiredAmountsByTarget = parsedArgs._targets.reduce<{
  //   [tokenAddress: string]: BigNumber;
  // }>((acc, target, index) => {
  //   const [, amount] = erc20Interface.decodeFunctionData(
  //     "transfer",
  //     parsedArgs._data[index],
  //   ) as [unknown, BigNumber];

  //   acc[target] ||= Zero;
  //   acc[target] = acc[target].add(amount);

  //   return acc;
  // }, {});

  // const chainId = parsedArgs._destinationChain.toString();
  // const fillerAddress = await context.multiProvider.getSignerAddress(chainId);
  // const provider = context.multiProvider.getProvider(chainId);

  // for (const tokenAddress in requiredAmountsByTarget) {
  //   const balance = await retrieveTokenBalance(
  //     tokenAddress,
  //     fillerAddress,
  //     provider,
  //   );

  //   if (balance.lt(requiredAmountsByTarget[tokenAddress])) {
  //     return {
  //       error: `Insufficient balance on destination chain ${chainId} for token ${tokenAddress}`,
  //       success: false,
  //     };
  //   }
  // }

  return { data: "Enough tokens to fulfill the intent", success: true };
};

export const create = (
  multiProvider: MultiProvider,
  customRules?: RulesMap<CompactXRule>,
) => {
  return new CompactXFiller(multiProvider, {
    base: [enoughBalanceOnDestination],
    custom: customRules,
  }).create();
};
