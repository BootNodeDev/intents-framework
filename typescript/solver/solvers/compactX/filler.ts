import { AddressZero } from "@ethersproject/constants";
import { type MultiProvider } from "@hyperlane-xyz/sdk";
import type { Result } from "@hyperlane-xyz/utils";

import { formatEther, parseEther } from "@ethersproject/units";
import { Tribunal__factory } from "../../typechain/factories/compactX/contracts/Tribunal__factory.js";
import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import { retrieveTokenBalance } from "../utils.js";
import {
  CHAIN_CONFIG,
  CHAIN_PRIORITY_FEES,
  SUPPORTED_ARBITER_ADDRESSES,
  SUPPORTED_CHAINS,
  SUPPORTED_TRIBUNAL_ADDRESSES,
  SupportedChainId,
} from "./config/constants.js";
import { allowBlockLists, metadata } from "./config/index.js";
import { PriceService } from "./services/price/PriceService.js";
import { TheCompactService } from "./services/TheCompactService.js";
import {
  type BroadcastRequest,
  BroadcastRequestSchema,
  type CompactXMetadata,
  type CompactXParsedArgs,
  ProcessedBroadcastResult,
} from "./types.js";
import { deriveClaimHash, log } from "./utils.js";
import { verifyBroadcastRequest } from "./validation/signature.js";

export type CompactXRule = CompactXFiller["rules"][number];

export class CompactXFiller extends BaseFiller<
  CompactXMetadata,
  CompactXParsedArgs,
  {}
> {
  private priceService: PriceService;

  constructor(multiProvider: MultiProvider, rules?: BuildRules<CompactXRule>) {
    super(multiProvider, allowBlockLists, metadata, log, rules);
    this.priceService = new PriceService();
    this.priceService.start();
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
  ): Promise<Result<BroadcastRequest>> {
    try {
      await super.prepareIntent(parsedArgs);

      const result = BroadcastRequestSchema.parse(parsedArgs.context);

      return { data: result, success: true };
    } catch (error: any) {
      return {
        error: error.message ?? "Failed to prepare Eco Intent.",
        success: false,
      };
    }
  }

  protected async fill(
    parsedArgs: CompactXParsedArgs,
    data: BroadcastRequest,
    originChainName: string,
  ) {
    this.log.info({
      msg: "Filling Intent",
      intent: `${this.metadata.protocolName}-${data.compact.id}`,
    });

    const chainId = Number.parseInt(
      data.chainId.toString(),
    ) as SupportedChainId;

    // Derive and log claim hash
    const claimHash = deriveClaimHash(chainId, data.compact);
    this.log.info(
      `Processing fill request for chainId ${chainId}, claimHash: ${claimHash}`,
    );

    // Set the claim hash before verification
    data.claimHash = claimHash;

    const theCompactService = new TheCompactService(
      this.multiProvider,
      this.log,
    );

    // Verify signatures
    this.log.info("Verifying signatures...");
    const { isValid, isOnchainRegistration, error } =
      await verifyBroadcastRequest(data, theCompactService);

    if (!isValid) {
      throw new Error(error);
    }

    // Log registration status
    this.log.info(
      `Signature verification successful, registration status: ${isOnchainRegistration ? "onchain" : "offchain"}`,
    );

    if (!SUPPORTED_CHAINS.includes(chainId)) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Check if either compact or mandate has expired or is close to expiring
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const COMPACT_EXPIRATION_BUFFER = 60n; // 60 seconds buffer for compact
    const MANDATE_EXPIRATION_BUFFER = 10n; // 10 seconds buffer for mandate

    if (
      BigInt(data.compact.expires) <=
      currentTimestamp + COMPACT_EXPIRATION_BUFFER
    ) {
      throw new Error(
        `Compact must have at least ${COMPACT_EXPIRATION_BUFFER} seconds until expiration`,
      );
    }

    if (
      BigInt(data.compact.mandate.expires) <=
      currentTimestamp + MANDATE_EXPIRATION_BUFFER
    ) {
      throw new Error(
        `Mandate must have at least ${MANDATE_EXPIRATION_BUFFER} seconds until expiration`,
      );
    }

    // Check if nonce has already been consumed
    const nonceConsumed = await theCompactService.hasConsumedAllocatorNonce(
      chainId,
      BigInt(data.compact.nonce),
      data.compact.arbiter as `0x${string}`,
    );

    if (nonceConsumed) {
      throw new Error("Nonce has already been consumed");
    }

    // Process the broadcast transaction
    const mandateChainId = Number(
      data.compact.mandate.chainId,
    ) as SupportedChainId;

    // Validate arbiter and tribunal addresses
    const arbiterAddress = data.compact.arbiter.toLowerCase();
    const tribunalAddress = data.compact.mandate.tribunal.toLowerCase();

    if (
      arbiterAddress !==
      SUPPORTED_ARBITER_ADDRESSES[
        Number(data.chainId) as SupportedChainId
      ].toLowerCase()
    ) {
      throw new Error("Unsupported arbiter address");
    }

    if (
      tribunalAddress !==
      SUPPORTED_TRIBUNAL_ADDRESSES[mandateChainId].toLowerCase()
    ) {
      throw new Error("Unsupported tribunal address");
    }

    const result = await this.processBroadcastTransaction(data, mandateChainId);

    // // Handle the result
    // wsManager.broadcastFillRequest(
    //   JSON.stringify(request),
    //   result.success,
    //   result.success ? undefined : result.reason
    // );

    // return res.status(result.success ? 200 : 400).json({
    //   success: result.success,
    //   ...(result.success
    //     ? { transactionHash: result.hash }
    //     : { reason: result.reason }),
    //   details: result.details,
    // });
  }

  protected async processBroadcastTransaction(
    request: BroadcastRequest,
    chainId: SupportedChainId,
  ): Promise<ProcessedBroadcastResult> {
    // Get the chain object and config for the mandate's chain
    const mandateChainId = Number(
      request.compact.mandate.chainId,
    ) as SupportedChainId;
    const mandateChainConfig = CHAIN_CONFIG[mandateChainId];
    this.log.debug(`Evaluating fill against chainId ${mandateChainId}`);

    // Use chain from public client
    // const chain = publicClient.chain;
    const provider = this.multiProvider.getProvider(chainId);
    const fillerAddress = await this.multiProvider.getSignerAddress(chainId);

    // Get current ETH price for the chain from memory
    const ethPrice = this.priceService.getPrice(chainId);
    this.log.debug({ msg: "Current ETH price", chainId, ethPrice });

    // Extract the dispensation amount in USD from the request and add 25% buffer
    const dispensationUSD = Number.parseFloat(
      request.context.dispensationUSD.replace("$", ""),
    );
    const bufferedDispensation =
      (BigInt(request.context.dispensation) * 125n) / 100n;

    // Calculate simulation values
    const minimumAmount = BigInt(request.compact.mandate.minimumAmount);
    const simulationSettlement = (minimumAmount * 101n) / 100n;

    // Get cached balances for the mandate chain
    // const cachedBalances = tokenBalanceService.getBalances(chainId);
    // if (!cachedBalances) {
    //   return {
    //     success: false,
    //     reason: "Could not get cached balances for chain",
    //     details: {
    //       dispensationUSD,
    //     },
    //   };
    // }

    // Calculate settlement amount based on mandate token (ETH/WETH check)
    const mandateTokenAddress = request.compact.mandate.token.toLowerCase();
    const mandateTokens = mandateChainConfig.tokens;
    const isSettlementTokenETHorWETH =
      mandateTokenAddress === mandateTokens.ETH.address.toLowerCase() ||
      mandateTokenAddress === mandateTokens.WETH.address.toLowerCase();

    if (
      mandateTokenAddress !== mandateTokens.ETH.address.toLowerCase() &&
      mandateTokenAddress !== mandateTokens.WETH.address.toLowerCase() &&
      mandateTokenAddress !== mandateTokens.USDC.address.toLowerCase()
    ) {
      return {
        success: false,
        reason: "Unsupported mandate token",
        details: {
          dispensationUSD,
        },
      };
    }

    // Get the relevant token balance based on mandate token
    const relevantTokenBalance = await retrieveTokenBalance(
      mandateTokenAddress,
      fillerAddress,
      provider,
    );

    // Check if we have sufficient token balance for minimum amount
    if (relevantTokenBalance.lt(minimumAmount)) {
      return {
        success: false,
        reason: "Token balance is less than minimum required settlement amount",
        details: {
          dispensationUSD,
        },
      };
    }

    // Check if we have sufficient token balance for simulation settlement
    if (relevantTokenBalance.lt(simulationSettlement)) {
      return {
        success: false,
        reason: "Token balance is less than simulation settlement amount",
        details: {
          dispensationUSD,
        },
      };
    }

    // Calculate simulation priority fee
    const simulationPriorityFee = CHAIN_PRIORITY_FEES[chainId];

    // Calculate simulation value
    const simulationValue =
      request.compact.mandate.token === AddressZero
        ? simulationSettlement + bufferedDispensation
        : bufferedDispensation;

    const ethBalance = await retrieveTokenBalance(
      AddressZero,
      fillerAddress,
      provider,
    );

    // Check if we have sufficient ETH for simulation value
    if (ethBalance.lt(simulationValue)) {
      return {
        success: false,
        reason: "ETH balance is less than simulation value",
        details: {
          dispensationUSD,
        },
      };
    }

    const signer = this.multiProvider.getSigner(chainId);

    const tribunal = Tribunal__factory.connect(
      request.compact.mandate.tribunal,
      signer,
    );

    // Encode simulation data with proper ABI
    const { mandate, ...compact } = request.compact;
    const data = tribunal.interface.encodeFunctionData("fill", [
      {
        chainId: request.chainId,
        compact: {
          arbiter: compact.arbiter,
          sponsor: compact.sponsor,
          nonce: compact.nonce,
          expires: compact.expires,
          id: compact.id,
          amount: compact.amount,
        },
        sponsorSignature:
          !request.sponsorSignature || request.sponsorSignature === "0x"
            ? `0x${"0".repeat(128)}`
            : request.sponsorSignature,
        allocatorSignature: request.allocatorSignature,
      },
      {
        recipient: mandate.recipient,
        expires: mandate.expires,
        token: mandate.token,
        minimumAmount: mandate.minimumAmount,
        baselinePriorityFee: mandate.baselinePriorityFee,
        scalingFactor: mandate.scalingFactor,
        salt: mandate.salt,
      },
      fillerAddress,
    ]);

    // Get current base fee from latest block using mandate chain
    const block = await provider.getBlock("latest");
    const baseFee = block.baseFeePerGas?.toBigInt();

    if (!baseFee) {
      return {
        success: false,
        reason: "Could not get base fee from latest block",
        details: {
          dispensationUSD,
        },
      };
    }

    // Estimate gas using simulation values and add 25% buffer
    this.log.debug("Performing initial simulation to get gas estimate");
    const estimatedGas = await provider.estimateGas({
      to: request.compact.mandate.tribunal,
      value: simulationValue,
      data,
      maxFeePerGas: simulationPriorityFee + (baseFee * 120n) / 100n,
      maxPriorityFeePerGas: simulationPriorityFee,
      from: fillerAddress,
    });

    const gasWithBuffer = (estimatedGas.toBigInt() * 125n) / 100n;
    this.log.debug({
      msg: "Got gas estimate",
      estimatedGas,
      gasWithBuffer,
    });

    // Calculate max fee and total gas cost
    const maxFeePerGas = simulationPriorityFee + (baseFee * 120n) / 100n; // Base fee + 20% buffer
    const totalGasCost = maxFeePerGas * gasWithBuffer;
    const gasCostEth = Number(formatEther(totalGasCost));
    const gasCostUSD = gasCostEth * ethPrice;

    // Calculate execution costs
    const executionCostWei = totalGasCost + bufferedDispensation;
    const executionCostUSD = gasCostUSD + dispensationUSD;

    // Get claim token from compact ID and check if it's ETH/WETH across all chains
    const claimTokenHex = BigInt(request.compact.id).toString(16).slice(-40);
    const claimToken = `0x${claimTokenHex}`.toLowerCase();

    // Check if token is ETH/WETH in any supported chain
    // TODO: why on any supported chain? Shouldn't it be only the chain of the claim?
    const isETHorWETH = Object.values(CHAIN_CONFIG).some(
      (chainConfig) =>
        claimToken === chainConfig.tokens.ETH.address.toLowerCase() ||
        claimToken === chainConfig.tokens.WETH.address.toLowerCase(),
    );

    // Calculate claim amount less execution costs
    let claimAmountLessExecutionCostsWei: bigint;
    let claimAmountLessExecutionCostsUSD: number;
    if (isETHorWETH) {
      claimAmountLessExecutionCostsWei =
        BigInt(request.compact.amount) - executionCostWei;
      claimAmountLessExecutionCostsUSD =
        Number(formatEther(claimAmountLessExecutionCostsWei)) * ethPrice;
    } else {
      // Assume USDC with 6 decimals
      // TODO-1: refactor this to allow any non-ETH/WETH token
      claimAmountLessExecutionCostsUSD =
      Number(request.compact.amount) / 1e6 - executionCostUSD;
      // TODO-2: check how negative values makes this fail
      claimAmountLessExecutionCostsWei = parseEther(
        (claimAmountLessExecutionCostsUSD / ethPrice).toString(),
      ).toBigInt();
    }

    const settlementAmount = isSettlementTokenETHorWETH
      ? claimAmountLessExecutionCostsWei
      : BigInt(Math.floor(claimAmountLessExecutionCostsUSD * 1e6)); // Scale up USDC amount

    this.log.debug({
      msg: "Settlement",
      amount: settlementAmount,
      minimum: minimumAmount,
    });

    // Check if we have sufficient token balance for settlement amount
    if (relevantTokenBalance.toBigInt() < settlementAmount) {
      return {
        success: false,
        reason: "Token balance is less than settlement amount",
        details: {
          dispensationUSD,
        },
      };
    }

    // Check if profitable (settlement amount > minimum amount)
    if (settlementAmount <= minimumAmount) {
      return {
        success: false,
        reason: "Fill estimated to be unprofitable after execution costs",
        details: {
          dispensationUSD,
          gasCostUSD,
        },
      };
    }

    // Check if we have sufficient ETH for value
    if (ethBalance.toBigInt() < settlementAmount + bufferedDispensation) {
      return {
        success: false,
        reason: "ETH balance is less than settlement value",
        details: {
          dispensationUSD,
        },
      };
    }

    // Calculate final priority fee based on actual settlement amount
    const priorityFee = CHAIN_PRIORITY_FEES[chainId];

    // Calculate final value based on mandate token (using chain-specific ETH address)
    const value =
      mandateTokenAddress ===
      mandateChainConfig.tokens.ETH.address.toLowerCase()
        ? settlementAmount + bufferedDispensation
        : bufferedDispensation;

    // Do final gas estimation with actual values
    const finalEstimatedGas = await provider.estimateGas({
      to: request.compact.mandate.tribunal,
      value,
      data,
      maxFeePerGas: priorityFee + (baseFee * 120n) / 100n,
      maxPriorityFeePerGas: priorityFee,
      from: fillerAddress,
    });

    const finalGasWithBuffer = (finalEstimatedGas.toBigInt() * 125n) / 100n;

    this.log.debug({
      msg: "Got final gas estimate",
      finalEstimatedGas,
      finalGasWithBuffer,
    });

    // Check if we have enough ETH for value + gas using cached balance
    const requiredBalance =
      value + (priorityFee + (baseFee * 120n) / 100n) * finalGasWithBuffer;

    if (ethBalance.toBigInt() < requiredBalance) {
      const shortageWei = requiredBalance - ethBalance.toBigInt();
      const shortageEth = Number(formatEther(shortageWei));
      return {
        success: false,
        reason: `Insufficient ETH balance. Need ${formatEther(requiredBalance)} ETH but only have ${formatEther(ethBalance)} ETH (short ${shortageEth.toFixed(6)} ETH)`,
        details: {
          dispensationUSD,
          gasCostUSD,
        },
      };
    }

    this.log.debug({
      msg: "account balance exceeds required balance. Submitting transaction!",
      ethBalance,
      requiredBalance,
    });

    // Submit transaction with the wallet client
    const response = await signer.sendTransaction({
      to: request.compact.mandate.tribunal,
      value,
      maxFeePerGas: priorityFee + (baseFee * 120n) / 100n,
      chainId,
      maxPriorityFeePerGas: priorityFee,
      gasLimit: finalGasWithBuffer,
      data,
    });

    const receipt = await response.wait();

    // Calculate final costs and profit
    const finalGasCostWei =
      (priorityFee + (baseFee * 120n) / 100n) * finalGasWithBuffer;
    const finalGasCostEth = Number(formatEther(finalGasCostWei));
    const finalGasCostUSD = finalGasCostEth * ethPrice;

    this.log.info({
      msg: "Transaction submitted",
      hash: receipt.transactionHash,
      blockExplorer: `${mandateChainConfig.blockExplorer}/tx/${receipt.transactionHash})`,
    });
    this.log.debug({
      msg: "Settlement amount",
      settlementAmount,
      minimumAmount,
    });
    this.log.debug({
      msg: "Final gas cost",
      finalGasCostUSD: finalGasCostUSD.toFixed(2),
      finalGasCostWei: `${formatEther(finalGasCostWei)} ETH)`,
    });

    return {
      success: true,
      hash: receipt.transactionHash,
      details: {
        dispensationUSD,
        gasCostUSD: finalGasCostUSD,
        netProfitUSD: 0,
        minProfitUSD: 0,
      },
    };
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
