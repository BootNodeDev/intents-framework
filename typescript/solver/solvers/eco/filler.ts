import { Zero } from "@ethersproject/constants";
import { type MultiProvider } from "@hyperlane-xyz/sdk";
import { type Result } from "@hyperlane-xyz/utils";

import { type BigNumber } from "ethers";

import { chainIds, chainIdsToName } from "../../config/index.js";
import { Erc20__factory } from "../../typechain/factories/contracts/Erc20__factory.js";
import { EcoAdapter__factory } from "../../typechain/factories/eco/contracts/EcoAdapter__factory.js";
import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import {
  retrieveOriginInfo,
  retrieveTargetInfo,
  retrieveTokenBalance,
} from "../utils.js";
import { allowBlockLists, metadata } from "./config/index.js";
import type { EcoMetadata, IntentData, ParsedArgs } from "./types.js";
import { log, withdrawRewards } from "./utils.js";

export type EcoRule = EcoFiller["rules"][number];

export class EcoFiller extends BaseFiller<EcoMetadata, ParsedArgs, IntentData> {
  constructor(multiProvider: MultiProvider, rules?: BuildRules<EcoRule>) {
    super(multiProvider, allowBlockLists, metadata, log, rules);
  }

  protected retrieveOriginInfo(parsedArgs: ParsedArgs, chainName: string) {
    const originTokens = parsedArgs._rewardTokens.map((tokenAddress, index) => {
      const amount = parsedArgs._rewardAmounts[index];
      return { amount, chainName, tokenAddress };
    });

    return retrieveOriginInfo({
      multiProvider: this.multiProvider,
      tokens: originTokens,
    });
  }

  protected retrieveTargetInfo(parsedArgs: ParsedArgs) {
    const chainId = parsedArgs._destinationChain.toString();
    const chainName = chainIdsToName[chainId];
    const erc20Interface = Erc20__factory.createInterface();

    const targetTokens = parsedArgs._targets.map((tokenAddress, index) => {
      const [, amount] = erc20Interface.decodeFunctionData(
        "transfer",
        parsedArgs._data[index],
      ) as [unknown, BigNumber];

      return { amount, chainName, tokenAddress };
    });

    return retrieveTargetInfo({
      multiProvider: this.multiProvider,
      tokens: targetTokens,
    });
  }

  protected async prepareIntent(
    parsedArgs: ParsedArgs,
  ): Promise<Result<IntentData>> {
    const chainName = this.multiProvider.getChainName(
      parsedArgs._destinationChain.toString(),
    );
    const adapterAddress = this.metadata.adapters[chainName];

    if (!adapterAddress) {
      return {
        error: "No adapter found for destination chain",
        success: false,
      };
    }

    try {
      await super.prepareIntent(parsedArgs);

      return { data: { adapterAddress }, success: true };
    } catch (error: any) {
      return {
        error: error.message ?? "Failed to prepare Eco Intent.",
        success: false,
      };
    }
  }

  protected async fill(
    parsedArgs: ParsedArgs,
    data: IntentData,
    originChainName: string,
  ) {
    this.log.info({
      msg: "Filling Intent",
      intent: `${this.metadata.protocolName}-${parsedArgs._hash}`,
    });

    this.log.debug({
      msg: "Approving tokens",
      protocolName: this.metadata.protocolName,
      intentHash: parsedArgs._hash,
      adapterAddress: data.adapterAddress,
    });

    const erc20Interface = Erc20__factory.createInterface();

    const requiredAmountsByTarget = parsedArgs._targets.reduce<{
      [tokenAddress: string]: BigNumber;
    }>((acc, target, index) => {
      const [, amount] = erc20Interface.decodeFunctionData(
        "transfer",
        parsedArgs._data[index],
      ) as [unknown, BigNumber];

      acc[target] ||= Zero;
      acc[target] = acc[target].add(amount);

      return acc;
    }, {});

    const destinationChainId = parsedArgs._destinationChain.toString();
    const signer = this.multiProvider.getSigner(destinationChainId);

    await Promise.all(
      Object.entries(requiredAmountsByTarget).map(
        async ([target, requiredAmount]) => {
          const erc20 = Erc20__factory.connect(target, signer);

          const tx = await erc20.approve(data.adapterAddress, requiredAmount);
          await tx.wait();
        },
      ),
    );

    const ecoAdapter = EcoAdapter__factory.connect(data.adapterAddress, signer);

    const claimantAddress =
      await this.multiProvider.getSignerAddress(originChainName);

    const { _targets, _data, _expiryTime, nonce, _hash, _prover } = parsedArgs;

    const value = await ecoAdapter.fetchFee(
      chainIds[originChainName],
      [_hash],
      [claimantAddress],
      _prover,
    );

    const tx = await ecoAdapter.fulfillHyperInstant(
      chainIds[originChainName],
      _targets,
      _data,
      _expiryTime,
      nonce,
      claimantAddress,
      _hash,
      _prover,
      { value },
    );

    const receipt = await tx.wait();

    this.log.info({
      msg: "Filled Intent",
      intent: `${this.metadata.protocolName}-${parsedArgs._hash}`,
      txDetails: receipt.transactionHash,
      txHash: receipt.transactionHash,
    });
  }

  settleOrder(
    parsedArgs: ParsedArgs,
    data: IntentData,
    originChainName: string,
  ) {
    return withdrawRewards(
      parsedArgs,
      originChainName,
      this.multiProvider,
      this.metadata.protocolName,
    );
  }
}

const enoughBalanceOnDestination: EcoRule = async (parsedArgs, context) => {
  const erc20Interface = Erc20__factory.createInterface();

  const requiredAmountsByTarget = parsedArgs._targets.reduce<{
    [tokenAddress: string]: BigNumber;
  }>((acc, target, index) => {
    const [, amount] = erc20Interface.decodeFunctionData(
      "transfer",
      parsedArgs._data[index],
    ) as [unknown, BigNumber];

    acc[target] ||= Zero;
    acc[target] = acc[target].add(amount);

    return acc;
  }, {});

  const chainId = parsedArgs._destinationChain.toString();
  const fillerAddress = await context.multiProvider.getSignerAddress(chainId);
  const provider = context.multiProvider.getProvider(chainId);

  for (const tokenAddress in requiredAmountsByTarget) {
    const balance = await retrieveTokenBalance(
      tokenAddress,
      fillerAddress,
      provider,
    );

    if (balance.lt(requiredAmountsByTarget[tokenAddress])) {
      return {
        error: `Insufficient balance on destination chain ${chainId} for token ${tokenAddress}`,
        success: false,
      };
    }
  }

  return { data: "Enough tokens to fulfill the intent", success: true };
};

export const create = (
  multiProvider: MultiProvider,
  customRules?: RulesMap<EcoRule>,
) => {
  return new EcoFiller(multiProvider, {
    base: [enoughBalanceOnDestination],
    custom: customRules,
  }).create();
};
