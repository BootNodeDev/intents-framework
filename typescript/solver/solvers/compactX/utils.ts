import { createLogger } from "../../logger.js";
import { metadata } from "./config/index.js";

import { keccak256 } from "@ethersproject/keccak256";
import { arrayify } from "@ethersproject/bytes";
import { AbiCoder } from "@ethersproject/abi";
import { toUtf8Bytes } from "@ethersproject/strings";
import { BroadcastRequest } from "./types.js";

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
