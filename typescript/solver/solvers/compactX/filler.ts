import { type MultiProvider } from "@hyperlane-xyz/sdk";
import type { Result } from "@hyperlane-xyz/utils";

import { formatEther } from "@ethersproject/units";
import { Tribunal__factory } from "../../typechain/factories/compactX/contracts/Tribunal__factory.js";
import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import { retrieveTokenBalance } from "../utils.js";
import { allowBlockLists, metadata } from "./config/index.js";
import { PriceService } from "./services/price/PriceService.js";
import { TheCompactService } from "./services/TheCompactService.js";
import {
  type BroadcastRequest,
  BroadcastRequestSchema,
  type CompactXMetadata,
  type CompactXParsedArgs,
} from "./types.js";
import {
  calculateFillValue,
  deriveClaimHash,
  ensureIsSupportedChainId,
  getMaxSettlementAmount,
  isSupportedChainToken,
  log,
} from "./utils.js";
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
        error:
          error.message ?? `Failed to prepare ${metadata.protocolName} Intent.`,
        success: false,
      };
    }
  }

  protected async fill(
    parsedArgs: CompactXParsedArgs,
    request: BroadcastRequest,
  ) {
    this.log.info({
      msg: "Filling Intent",
      intent: `${this.metadata.protocolName}-${request.compact.id}`,
    });

    const chainId = ensureIsSupportedChainId(request.chainId);

    // Derive and log claim hash
    const claimHash = deriveClaimHash(request.compact);
    this.log.info({
      msg: "Processing fill request",
      claimHash,
      chainId,
    });

    // Set the claim hash before verification
    request.claimHash = claimHash;

    const theCompactService = new TheCompactService(
      this.multiProvider,
      this.log,
    );

    // Verify signatures
    this.log.info("Verifying signatures...");
    const { isValid, isOnchainRegistration, error } =
      await verifyBroadcastRequest(request, theCompactService);

    if (!isValid) {
      throw new Error(error);
    }

    // Log registration status
    this.log.debug({
      msg: "Signature verification",
      isOnchainRegistration,
    });

    // Check if either compact or mandate has expired or is close to expiring
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const { compactExpirationBuffer, mandateExpirationBuffer } =
      metadata.chainInfo[chainId];

    if (
      BigInt(request.compact.expires) <=
      currentTimestamp + compactExpirationBuffer
    ) {
      throw new Error(
        `Compact must have at least ${compactExpirationBuffer} seconds until expiration`,
      );
    }

    if (
      BigInt(request.compact.mandate.expires) <=
      currentTimestamp + mandateExpirationBuffer
    ) {
      throw new Error(
        `Mandate must have at least ${mandateExpirationBuffer} seconds until expiration`,
      );
    }

    // Check if nonce has already been consumed
    const nonceConsumed = await theCompactService.hasConsumedAllocatorNonce(
      chainId,
      BigInt(request.compact.nonce),
      request.compact.arbiter,
    );

    if (nonceConsumed) {
      throw new Error("Nonce has already been consumed");
    }

    // Process the broadcast transaction
    const mandateChainId = ensureIsSupportedChainId(
      request.compact.mandate.chainId,
    );

    // Validate arbiter and tribunal addresses
    if (request.compact.arbiter !== metadata.chainInfo[chainId].arbiter) {
      throw new Error("Unsupported arbiter address");
    }

    if (
      request.compact.mandate.tribunal !==
      metadata.chainInfo[mandateChainId].tribunal
    ) {
      throw new Error("Unsupported tribunal address");
    }

    const provider = this.multiProvider.getProvider(mandateChainId);
    const signer = this.multiProvider.getSigner(mandateChainId);
    const fillerAddress = await signer.getAddress();

    // Get current ETH price for the chain from memory
    const ethPrice = this.priceService.getPrice(mandateChainId);

    // Calculate simulation values
    const minimumAmount = BigInt(request.compact.mandate.minimumAmount);
    const bufferedMinimumAmount = (minimumAmount * 101n) / 100n;

    // Calculate settlement amount based on mandate token (ETH/WETH check)
    const mandateTokenAddress = request.compact.mandate.token;

    if (isSupportedChainToken(mandateChainId, mandateTokenAddress)) {
      throw new Error(
        `Unsupported mandate token ${mandateTokenAddress}, on chain ${mandateChainId}`,
      );
    }

    // Get the relevant token balance based on mandate token
    const mandateTokenBalance = (
      await retrieveTokenBalance(mandateTokenAddress, fillerAddress, provider)
    ).toBigInt();

    // Check if we have sufficient token balance for simulation settlement
    if (mandateTokenBalance < bufferedMinimumAmount) {
      throw new Error(
        `Token balance (${mandateTokenBalance}) is less than simulation settlement amount (${bufferedMinimumAmount})`,
      );
    }

    // Get current base fee from latest block using mandate chain
    const block = await provider.getBlock("latest");
    const baseFeePerGas = block.baseFeePerGas?.toBigInt();

    if (!baseFeePerGas) {
      throw new Error("Could not get base fee from latest block");
    }

    // Calculate simulation priority fee
    const maxPriorityFeePerGas = metadata.chainInfo[mandateChainId].priorityFee;
    const bufferedBaseFeePerGas = (baseFeePerGas * 120n) / 100n; // Base fee + 20% buffer
    const maxFeePerGas = maxPriorityFeePerGas + bufferedBaseFeePerGas;

    // Calculate simulation value
    const simulationValue = calculateFillValue(request, bufferedMinimumAmount);
    const ethBalance = (await signer.getBalance()).toBigInt();

    // Check if we have sufficient ETH for simulation value
    if (ethBalance < simulationValue) {
      throw new Error(
        `ETH balance (${ethBalance}) is less than simulation value (${simulationValue})`,
      );
    }

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

    // Estimate gas using simulation values and add 25% buffer
    this.log.debug("Performing initial simulation to get gas estimate");
    const estimatedGas = (
      await signer.estimateGas({
        to: request.compact.mandate.tribunal,
        value: simulationValue,
        data,
        maxFeePerGas,
        maxPriorityFeePerGas,
      })
    ).toBigInt();

    const maxSettlementAmount = getMaxSettlementAmount({
      estimatedGas,
      ethPrice,
      maxFeePerGas,
      request,
    });

    this.log.debug({
      msg: "Settlement",
      amount: maxSettlementAmount,
      minimum: minimumAmount,
    });

    // Check if we have sufficient token balance for settlement amount
    if (mandateTokenBalance < maxSettlementAmount) {
      throw new Error(
        `Token balance (${mandateTokenBalance}) is less than settlement amount (${maxSettlementAmount})`,
      );
    }

    // Check if profitable (settlement amount > minimum amount)
    if (maxSettlementAmount <= minimumAmount) {
      throw new Error(
        `Fill estimated to be unprofitable after execution costs (${maxSettlementAmount} <= ${minimumAmount})`,
      );
    }

    // Calculate final value based on mandate token (using chain-specific ETH address)
    const value = calculateFillValue(request, maxSettlementAmount);

    // Check if we have sufficient ETH for value
    if (ethBalance < value) {
      throw new Error(
        `ETH balance (${ethBalance}) is less than settlement value (${value})`,
      );
    }

    // Do final gas estimation with actual values
    const finalEstimatedGas = (
      await signer.estimateGas({
        to: request.compact.mandate.tribunal,
        value,
        data,
        maxFeePerGas,
        maxPriorityFeePerGas,
      })
    ).toBigInt();

    const bufferedGasLimit = (finalEstimatedGas * 125n) / 100n;

    this.log.debug({
      msg: "Got final gas estimate",
      finalEstimatedGas,
      finalGasWithBuffer: bufferedGasLimit,
    });

    // Check if we have enough ETH for value + gas using cached balance
    const requiredBalance = value + maxFeePerGas * bufferedGasLimit;

    if (ethBalance < requiredBalance) {
      const shortageWei = requiredBalance - ethBalance;
      const shortageEth = +formatEther(shortageWei);

      throw new Error(
        `Insufficient ETH balance. Need ${formatEther(requiredBalance)} ETH but only have ${formatEther(ethBalance)} ETH (short ${shortageEth.toFixed(
          6,
        )} ETH)`,
      );
    }

    this.log.debug({
      msg: "Account balance exceeds required balance. Submitting transaction!",
      ethBalance,
      requiredBalance,
    });

    // Submit transaction with the wallet client
    const response = await signer.sendTransaction({
      to: request.compact.mandate.tribunal,
      value,
      maxFeePerGas,
      chainId: mandateChainId,
      maxPriorityFeePerGas,
      gasLimit: bufferedGasLimit,
      data,
    });

    const receipt = await response.wait();

    // Calculate final costs and profit
    const finalGasCostWei = maxFeePerGas * bufferedGasLimit;
    const finalGasCostEth = +formatEther(finalGasCostWei);
    const finalGasCostUSD = finalGasCostEth * ethPrice;

    this.log.info({
      msg: "Transaction submitted",
      hash: receipt.transactionHash,
      txInfo:
        this.multiProvider.tryGetExplorerTxUrl(mandateChainId, {
          hash: receipt.transactionHash,
        }) ?? receipt.transactionHash,
    });
    this.log.debug({
      msg: "Settlement amount",
      settlementAmount: maxSettlementAmount,
      minimumAmount,
    });
    this.log.debug({
      msg: "Final gas cost",
      finalGasCostUSD: finalGasCostUSD.toFixed(2),
      finalGasCostWei: `${formatEther(finalGasCostWei)} ETH)`,
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
