import { type MultiProvider } from "@hyperlane-xyz/sdk";
import { type Result } from "@hyperlane-xyz/utils";

import { BaseFiller } from "../BaseFiller.js";
import { BuildRules, RulesMap } from "../types.js";
import { allowBlockLists, metadata } from "./config/index.js";
import { type CompactXMetadata, type CompactXParsedArgs, type BroadcastRequest, BroadcastRequestSchema } from "./types.js";
import { log, deriveClaimHash } from "./utils.js";
import { SupportedChainId, SUPPORTED_CHAINS, SUPPORTED_ARBITER_ADDRESSES, SUPPORTED_TRIBUNAL_ADDRESSES } from "./config/constants.js"
import { verifyBroadcastRequest } from "./validation/signature.js";
import { TheCompactService } from "./services/TheCompactService.js";

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
      data.chainId.toString()
    ) as SupportedChainId;

    // Derive and log claim hash
    const claimHash = deriveClaimHash(chainId, data.compact);
    this.log.info(
      `Processing fill request for chainId ${chainId}, claimHash: ${claimHash}`
    );

    // Set the claim hash before verification
    data.claimHash = claimHash;

    const theCompactService = new TheCompactService(this.multiProvider, this.log);

    // Verify signatures
    this.log.info("Verifying signatures...");
    const { isValid, isOnchainRegistration, error } = await verifyBroadcastRequest(data, theCompactService);

    if (!isValid) {
      throw new Error(error);
    }

    // Log registration status
    this.log.info(
      `Signature verification successful, registration status: ${isOnchainRegistration ? "onchain" : "offchain"}`
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
      throw new Error(`Compact must have at least ${COMPACT_EXPIRATION_BUFFER} seconds until expiration`);
    }

    if (
      BigInt(data.compact.mandate.expires) <=
      currentTimestamp + MANDATE_EXPIRATION_BUFFER
    ) {
      throw new Error(`Mandate must have at least ${MANDATE_EXPIRATION_BUFFER} seconds until expiration`);
    }

    // Check if nonce has already been consumed
    const nonceConsumed = await theCompactService.hasConsumedAllocatorNonce(
      chainId,
      BigInt(data.compact.nonce),
      data.compact.arbiter as `0x${string}`
    );

    if (nonceConsumed) {
      throw new Error("Nonce has already been consumed");
    }

    // Process the broadcast transaction
    const mandateChainId = Number(
      data.compact.mandate.chainId
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
      wsManager.broadcastFillRequest(
        JSON.stringify(request),
        false,
        "Unsupported tribunal address"
      );
      return res.status(400).json({ error: "Unsupported tribunal address" });
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
