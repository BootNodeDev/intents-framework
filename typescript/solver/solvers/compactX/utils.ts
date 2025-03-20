import { createLogger } from "../../logger.js";
import { metadata } from "./config/index.js";

import { keccak256 } from "@ethersproject/keccak256";
import { AbiCoder } from "@ethersproject/abi";
import { toUtf8Bytes } from "@ethersproject/strings";
import { formatEther, parseEther } from "@ethersproject/units";
import { BroadcastRequest } from "./types.js";
import { CHAIN_CONFIG, SUPPORTED_CHAINS, SupportedChainId } from "./config/constants.js";
import { assert } from "@hyperlane-xyz/utils";

export const log = createLogger(metadata.protocolName);

/**
 * Derives the claim hash using EIP-712 typed data hashing
 */
export function deriveClaimHash(
  chainId: number,
  compact: BroadcastRequest["compact"],
) {
  // Validate mandate parameters
  if (!compact.mandate.chainId) throw new Error("Mandate chainId is required");
  if (!compact.mandate.tribunal)
    throw new Error("Mandate tribunal is required");
  if (!compact.mandate.recipient)
    throw new Error("Mandate recipient is required");
  if (!compact.mandate.expires) throw new Error("Mandate expires is required");
  if (!compact.mandate.token) throw new Error("Mandate token is required");
  if (!compact.mandate.minimumAmount)
    throw new Error("Mandate minimumAmount is required");
  if (!compact.mandate.baselinePriorityFee)
    throw new Error("Mandate baselinePriorityFee is required");
  if (!compact.mandate.scalingFactor)
    throw new Error("Mandate scalingFactor is required");
  if (!compact.mandate.salt) throw new Error("Mandate salt is required");

  // Validate compact parameters
  if (!compact.arbiter) throw new Error("Compact arbiter is required");
  if (!compact.sponsor) throw new Error("Compact sponsor is required");
  if (!compact.nonce) throw new Error("Compact nonce is required");
  if (!compact.expires) throw new Error("Compact expires is required");
  if (!compact.id) throw new Error("Compact id is required");
  if (!compact.amount) throw new Error("Compact amount is required");

  // Calculate COMPACT_TYPEHASH to match Solidity's EIP-712 typed data
  const COMPACT_TYPESTRING =
    "Compact(address arbiter,address sponsor,uint256 nonce,uint256 expires,uint256 id,uint256 amount,Mandate mandate)Mandate(uint256 chainId,address tribunal,address recipient,uint256 expires,address token,uint256 minimumAmount,uint256 baselinePriorityFee,uint256 scalingFactor,bytes32 salt)";
  const COMPACT_TYPEHASH = keccak256(toUtf8Bytes(COMPACT_TYPESTRING));

  // Calculate MANDATE_TYPEHASH to match Solidity's EIP-712 typed data
  const MANDATE_TYPESTRING =
    "Mandate(uint256 chainId,address tribunal,address recipient,uint256 expires,address token,uint256 minimumAmount,uint256 baselinePriorityFee,uint256 scalingFactor,bytes32 salt)";
  const MANDATE_TYPEHASH = keccak256(toUtf8Bytes(MANDATE_TYPESTRING));

  const abiCoder = new AbiCoder();
  // Now encode all the mandate parameters with the mandate typehash
  const encodedMandateData = abiCoder.encode(
    [
      "bytes32", // MANDATE_TYPEHASH
      "uint256", // mandate.chainId
      "address", // mandate.tribunal
      "address", // mandate.recipient
      "uint256", // mandate.expires
      "address", // mandate.token
      "uint256", // mandate.minimumAmount
      "uint256", // mandate.baselinePriorityFee
      "uint256", // mandate.scalingFactor
      "bytes32", // mandate.salt
    ],
    [
      MANDATE_TYPEHASH,
      BigInt(compact.mandate.chainId),
      compact.mandate.tribunal.toLowerCase(),
      compact.mandate.recipient.toLowerCase(),
      BigInt(compact.mandate.expires),
      compact.mandate.token.toLowerCase(),
      BigInt(compact.mandate.minimumAmount),
      BigInt(compact.mandate.baselinePriorityFee),
      BigInt(compact.mandate.scalingFactor),
      compact.mandate.salt,
    ],
  );

  // derive the "witness hash" using the mandate data
  const witnessHash = keccak256(encodedMandateData);

  // Now encode all the parameters with the typehash, matching the contract's abi.encode
  const encodedData = abiCoder.encode(
    [
      "bytes32", // COMPACT_TYPEHASH
      "address", // arbiter
      "address", // sponsor
      "uint256", // nonce
      "uint256", // expires
      "uint256", // id
      "uint256", // amount
      "bytes32", // witnessHash
    ],
    [
      COMPACT_TYPEHASH,
      compact.arbiter.toLowerCase(),
      compact.sponsor.toLowerCase(),
      BigInt(compact.nonce),
      BigInt(compact.expires),
      BigInt(compact.id),
      BigInt(compact.amount),
      witnessHash,
    ],
  );

  // Return the final hash
  return keccak256(encodedData);
}

export function isSupportedChainId(
  chainId: string | number,
): chainId is SupportedChainId {
  return SUPPORTED_CHAINS.includes(+chainId as SupportedChainId);
}

export function ensureIsSupportedChainId(chainId: string | number) {
  assert(isSupportedChainId(chainId), `Unsupported chainId: ${chainId}`);

  return chainId;
}

export function getChainConfig(chainId: string | number) {
  const supportedChainId = ensureIsSupportedChainId(chainId);
  return CHAIN_CONFIG[supportedChainId];
}

export function getChainSupportedTokens(chainId: string | number) {
  return getChainConfig(chainId).tokens;
}

export function isNativeOrWrappedNative(
  chainId: string | number,
  token: string,
): boolean {
  const { ETH, WETH } = getChainSupportedTokens(chainId);
  token = token.toLowerCase();

  return (
    token === ETH.address.toLowerCase() || token === WETH.address.toLowerCase()
  );
}

export function calculateFillValue(
  request: BroadcastRequest,
  settlementAmount: bigint,
) {
  const { ETH } = getChainSupportedTokens(request.compact.mandate.chainId);
  const mandateTokenAddress = request.compact.mandate.token.toLowerCase();
  const bufferedDispensation =
    (BigInt(request.context.dispensation) * 125n) / 100n;

  return mandateTokenAddress === ETH.address.toLowerCase()
    ? settlementAmount + bufferedDispensation
    : bufferedDispensation;
}

// TODO-RULE: move into a rule
export function isSupportedChainToken(chainId: string | number, token: string) {
  const chainTokens = getChainSupportedTokens(chainId);

  return !Object.keys(chainTokens).some(
    (symbol) => token === chainTokens[symbol].address.toLowerCase(),
  );
}

export function getMaxSettlementAmount({
  estimatedGas,
  ethPrice,
  maxFeePerGas,
  request,
}: {
  estimatedGas: bigint;
  ethPrice: number;
  maxFeePerGas: bigint;
  request: BroadcastRequest;
}) {
  // Extract the dispensation amount in USD from the request and add 25% buffer
  const dispensationUSD = +request.context.dispensationUSD.replace("$", "");
  const dispensation = BigInt(request.context.dispensation);
  const bufferedDispensation = (dispensation * 125n) / 100n;

  const bufferedEstimatedGas = (estimatedGas * 125n) / 100n;
  log.debug({
    msg: "Got gas estimate",
    estimatedGas,
    bufferedEstimatedGas,
  });

  // Calculate max fee and total gas cost
  const gasCostWei = maxFeePerGas * bufferedEstimatedGas;
  const gasCostEth = +formatEther(gasCostWei);
  const gasCostUSD = gasCostEth * ethPrice;

  // Calculate execution costs
  const executionCostWei = gasCostWei + bufferedDispensation;
  const executionCostUSD = gasCostUSD + dispensationUSD;

  // Get claim token from compact ID and check if it's ETH/WETH across all chains
  const claimToken =
    `0x${BigInt(request.compact.id).toString(16).slice(-40)}`.toLowerCase();

  // Check if token is ETH/WETH in any supported chain
  const isClaimETHorWETH = isNativeOrWrappedNative(request.chainId, claimToken);
  const isSettlementTokenETHorWETH = isNativeOrWrappedNative(
    request.compact.mandate.chainId,
    request.compact.mandate.token.toLowerCase(),
  );

  // Calculate claim amount less execution costs
  let claimAmountLessExecutionCostsWei: bigint;
  let claimAmountLessExecutionCostsUSD: number;

  if (isClaimETHorWETH) {
    claimAmountLessExecutionCostsWei =
      BigInt(request.compact.amount) - executionCostWei;
    claimAmountLessExecutionCostsUSD =
      +formatEther(claimAmountLessExecutionCostsWei) * ethPrice;
  } else {
    // Assume USDC with 6 decimals
    // TODO-1: refactor this to allow any non-ETH/WETH token, not only USDC
    claimAmountLessExecutionCostsUSD =
      Number(request.compact.amount) / 1e6 - executionCostUSD;
    claimAmountLessExecutionCostsWei = parseEther(
      (claimAmountLessExecutionCostsUSD / ethPrice).toFixed(18),
    ).toBigInt();
  }

  return isSettlementTokenETHorWETH
    ? claimAmountLessExecutionCostsWei
    : BigInt(Math.floor(claimAmountLessExecutionCostsUSD * 1e6)); // Scale up USDC amount
}
