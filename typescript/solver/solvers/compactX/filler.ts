import { type MultiProvider } from "@hyperlane-xyz/sdk";
import { type Result } from "@hyperlane-xyz/utils";
import { AddressZero } from "@ethersproject/constants";

import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import { allowBlockLists, metadata } from "./config/index.js";
import {
  type CompactXMetadata,
  type CompactXParsedArgs,
  type BroadcastRequest,
  BroadcastRequestSchema,
  ProcessedBroadcastResult,
} from "./types.js";
import { log, deriveClaimHash } from "./utils.js";
import {
  SupportedChainId,
  SUPPORTED_CHAINS,
  SUPPORTED_ARBITER_ADDRESSES,
  SUPPORTED_TRIBUNAL_ADDRESSES,
  CHAIN_PRIORITY_FEES,
  CHAIN_CONFIG,
} from "./config/constants.js";
import { verifyBroadcastRequest } from "./validation/signature.js";
import { TheCompactService } from "./services/TheCompactService.js";
import { retrieveTokenBalance } from "../utils.js";
import { Tribunal__factory } from "../../typechain/factories/compactX/contracts/Tribunal__factory.js";

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

    // const result = await processBroadcastTransaction(
    //   { ...request, chainId: Number(request.chainId) },
    //   mandateChainId,
    //   priceService,
    //   tokenBalanceService,
    //   publicClients[mandateChainId],
    //   walletClients[mandateChainId],
    //   account.address
    // );

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
    request: BroadcastRequest & { chainId: number },
    chainId: SupportedChainId,
    address: `0x${string}`
  ): Promise<ProcessedBroadcastResult> {
    // Get the chain object and config for the mandate's chain
    const mandateChainId = Number(
      request.compact.mandate.chainId
    ) as SupportedChainId;
    const mandateChainConfig = CHAIN_CONFIG[mandateChainId];
    this.log.debug(`Evaluating fill against chainId ${mandateChainId}`);

    // Use chain from public client
    // const chain = publicClient.chain;
    const provider = this.multiProvider.getProvider(chainId);
    const fillerAddress = await this.multiProvider.getSignerAddress(chainId);

    // Get current ETH price for the chain from memory
    // const ethPrice = priceService.getPrice(chainId);
    // logger.info(`Current ETH price on chain ${chainId}: $${ethPrice}`);

    // Extract the dispensation amount in USD from the request and add 25% buffer
    const dispensationUSD = Number.parseFloat(
      request.context.dispensationUSD.replace("$", "")
    );
    const bufferedDispensation =
      (BigInt(request.context.dispensation) * 125n) / 100n;

    // Calculate simulation values
    const minimumAmount = BigInt(request.compact.mandate.minimumAmount);
    const simulationSettlement = (minimumAmount * 101n) / 100n;
    const baselinePriorityFee = BigInt(
      request.compact.mandate.baselinePriorityFee
    );
    const scalingFactor = BigInt(request.compact.mandate.scalingFactor);

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
    const mandateTokenAddress =
      request.compact.mandate.token.toLowerCase() as `0x${string}`;
    const isSettlementTokenETHorWETH =
      mandateTokenAddress === mandateChainConfig.tokens.ETH.address.toLowerCase() ||
      mandateTokenAddress === mandateChainConfig.tokens.WETH.address.toLowerCase();

    if (
      mandateTokenAddress !== mandateChainConfig.tokens.ETH.address.toLowerCase() &&
      mandateTokenAddress !== mandateChainConfig.tokens.WETH.address.toLowerCase() &&
      mandateTokenAddress !== mandateChainConfig.tokens.USDC.address.toLowerCase()
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
      request.compact.mandate.token ===
      "0x0000000000000000000000000000000000000000"
        ? simulationSettlement + bufferedDispensation
        : bufferedDispensation;


    const ethBalance = await retrieveTokenBalance(
      AddressZero,
      fillerAddress,
      provider,
    );
    // Check if we have sufficient ETH for simulation value
    if (ethBalance.(simulationValue)) {
      return {
        success: false,
        reason: "ETH balance is less than simulation value",
        details: {
          dispensationUSD,
        },
      };
    }

    const tribunal = Tribunal__factory.connect(
      request.compact.mandate.tribunal,
      this.multiProvider.getSigner(chainId),
    );

    // Encode simulation data with proper ABI
    const data = tribunal.interface.encodeFunctionData("fill", [
      {
        chainId: BigInt(request.chainId),
        compact: {
          arbiter: request.compact.arbiter as `0x${string}`,
          sponsor: request.compact.sponsor as `0x${string}`,
          nonce: BigInt(request.compact.nonce),
          expires: BigInt(request.compact.expires),
          id: BigInt(request.compact.id),
          amount: BigInt(request.compact.amount),
        },
        sponsorSignature: (!request.sponsorSignature ||
        request.sponsorSignature === "0x"
          ? `0x${"0".repeat(128)}`
          : request.sponsorSignature) as `0x${string}`,
        allocatorSignature: request.allocatorSignature as `0x${string}`,
      },
      {
        recipient: request.compact.mandate.recipient as `0x${string}`,
        expires: BigInt(request.compact.mandate.expires),
        token: request.compact.mandate.token as `0x${string}`,
        minimumAmount: BigInt(request.compact.mandate.minimumAmount),
        baselinePriorityFee: BigInt(
          request.compact.mandate.baselinePriorityFee
        ),
        scalingFactor: BigInt(request.compact.mandate.scalingFactor),
        salt: request.compact.mandate.salt as `0x${string}`,
      },
      address,
    ])

    // // Encode simulation data with proper ABI
    // const data = encodeFunctionData({
    //   functionName: "fill",
    //   args: [
    //     {
    //       chainId: BigInt(request.chainId),
    //       compact: {
    //         arbiter: request.compact.arbiter as `0x${string}`,
    //         sponsor: request.compact.sponsor as `0x${string}`,
    //         nonce: BigInt(request.compact.nonce),
    //         expires: BigInt(request.compact.expires),
    //         id: BigInt(request.compact.id),
    //         amount: BigInt(request.compact.amount),
    //       },
    //       sponsorSignature: (!request.sponsorSignature ||
    //       request.sponsorSignature === "0x"
    //         ? `0x${"0".repeat(128)}`
    //         : request.sponsorSignature) as `0x${string}`,
    //       allocatorSignature: request.allocatorSignature as `0x${string}`,
    //     },
    //     {
    //       recipient: request.compact.mandate.recipient as `0x${string}`,
    //       expires: BigInt(request.compact.mandate.expires),
    //       token: request.compact.mandate.token as `0x${string}`,
    //       minimumAmount: BigInt(request.compact.mandate.minimumAmount),
    //       baselinePriorityFee: BigInt(
    //         request.compact.mandate.baselinePriorityFee
    //       ),
    //       scalingFactor: BigInt(request.compact.mandate.scalingFactor),
    //       salt: request.compact.mandate.salt as `0x${string}`,
    //     },
    //     address,
    //   ],
    // });

    // Get current base fee from latest block using mandate chain
    const block = await provider.getBlock('latest');
    const baseFee = BigInt(block.baseFeePerGas?.toString() || 0);
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
      to: request.compact.mandate.tribunal as `0x${string}`,
      value: simulationValue,
      data,
      maxFeePerGas: simulationPriorityFee + (baseFee * 120n) / 100n,
      maxPriorityFeePerGas: simulationPriorityFee,
      account: address,
    });

    const gasWithBuffer = (estimatedGas * 125n) / 100n;
    logger.info(
      `Got gas estimate: ${estimatedGas} (${gasWithBuffer} with buffer)`
    );

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
    const claimToken = `0x${claimTokenHex}`.toLowerCase() as `0x${string}`;

    // Check if token is ETH/WETH in any supported chain
    const isETHorWETH = Object.values(CHAIN_CONFIG).some(
      (chainConfig) =>
        claimToken === chainConfig.tokens.ETH.address.toLowerCase() ||
        claimToken === chainConfig.tokens.WETH.address.toLowerCase()
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
      claimAmountLessExecutionCostsUSD =
        Number(request.compact.amount) / 1e6 - executionCostUSD;
      claimAmountLessExecutionCostsWei = parseEther(
        (claimAmountLessExecutionCostsUSD / ethPrice).toString()
      );
    }

    const settlementAmount = isSettlementTokenETHorWETH
      ? claimAmountLessExecutionCostsWei
      : BigInt(Math.floor(claimAmountLessExecutionCostsUSD * 1e6)); // Scale up USDC amount

    logger.info(
      `Settlement amount: ${settlementAmount} (minimum: ${minimumAmount})`
    );

    // Check if we have sufficient token balance for settlement amount
    if (relevantTokenBalance < settlementAmount) {
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
    if (cachedBalances.ETH < settlementAmount + bufferedDispensation) {
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
      mandateTokenAddress === mandateChainConfig.tokens.ETH.address.toLowerCase()
        ? settlementAmount + bufferedDispensation
        : bufferedDispensation;

    // Do final gas estimation with actual values
    const finalEstimatedGas = await publicClient.estimateGas({
      to: request.compact.mandate.tribunal as `0x${string}`,
      value,
      data,
      maxFeePerGas: priorityFee + (baseFee * 120n) / 100n,
      maxPriorityFeePerGas: priorityFee,
      account: address,
    });

    const finalGasWithBuffer = (finalEstimatedGas * 125n) / 100n;

    logger.info(
      `Got final gas estimate: ${finalEstimatedGas} (${finalGasWithBuffer} with buffer)`
    );

    // Check if we have enough ETH for value + gas using cached balance
    const requiredBalance =
      value + (priorityFee + (baseFee * 120n) / 100n) * finalGasWithBuffer;

    if (cachedBalances.ETH < requiredBalance) {
      const shortageWei = requiredBalance - cachedBalances.ETH;
      const shortageEth = Number(formatEther(shortageWei));
      return {
        success: false,
        reason: `Insufficient ETH balance. Need ${formatEther(requiredBalance)} ETH but only have ${formatEther(cachedBalances.ETH)} ETH (short ${shortageEth.toFixed(6)} ETH)`,
        details: {
          dispensationUSD,
          gasCostUSD,
        },
      };
    }

    logger.info(
      `account balance ${cachedBalances.ETH} exceeds required balance of ${requiredBalance}. Submitting transaction!`
    );

    // Get the account from the wallet client
    const account = walletClient.account;
    if (!account) {
      throw new Error("No account found in wallet client");
    }

    // Submit transaction with the wallet client
    const hash = await walletClient.sendTransaction({
      to: request.compact.mandate.tribunal as `0x${string}`,
      value,
      maxFeePerGas: priorityFee + (baseFee * 120n) / 100n,
      maxPriorityFeePerGas: priorityFee,
      gas: finalGasWithBuffer,
      data: data as `0x${string}`,
      chain,
      account,
    });

    // Calculate final costs and profit
    const finalGasCostWei =
      (priorityFee + (baseFee * 120n) / 100n) * finalGasWithBuffer;
    const finalGasCostEth = Number(formatEther(finalGasCostWei));
    const finalGasCostUSD = finalGasCostEth * ethPrice;

    logger.info(
      `Transaction submitted: ${hash} (${mandateChainConfig.blockExplorer}/tx/${hash})`
    );
    logger.info(
      `Settlement amount: ${settlementAmount} (minimum: ${minimumAmount})`
    );
    logger.info(
      `Final gas cost: $${finalGasCostUSD.toFixed(2)} (${formatEther(finalGasCostWei)} ETH)`
    );

    return {
      success: true,
      hash,
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
