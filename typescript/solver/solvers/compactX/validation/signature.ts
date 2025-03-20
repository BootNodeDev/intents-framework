import ethers from "ethers";

import { metadata } from "../config/index.js";
import type {
  RegistrationStatus,
  TheCompactService,
} from "../services/TheCompactService.js";
import type { BroadcastRequest } from "../types.js";
import { ensureIsSupportedChainId, log } from "../utils.js";

// Extract allocator ID from compact.id
const extractAllocatorId = (compactId: string): string => {
  const compactIdBigInt = BigInt(compactId);

  // Shift right by 160 bits to remove the input token part
  const shiftedBigInt = compactIdBigInt >> 160n;

  // Then mask to get only the allocator ID bits (92 bits)
  const mask = (1n << 92n) - 1n;
  const allocatorIdBigInt = shiftedBigInt & mask;

  return allocatorIdBigInt.toString();
};

// The Compact typehash for registration checks
const COMPACT_REGISTRATION_TYPEHASH =
  "0x27f09e0bb8ce2ae63380578af7af85055d3ada248c502e2378b85bc3d05ee0b0" as const;

async function verifySignature(
  claimHash: string,
  signature: string,
  expectedSigner: string,
  chainPrefix: string,
): Promise<boolean> {
  try {
    // Ensure hex values have 0x prefix
    const normalizedClaimHash = claimHash.startsWith("0x")
      ? claimHash
      : `0x${claimHash}`;
    const normalizedPrefix = chainPrefix.startsWith("0x")
      ? chainPrefix
      : `0x${chainPrefix}`;
    const normalizedSignature = signature.startsWith("0x")
      ? signature
      : `0x${signature}`;

    log.debug({
      msg: "Verifying signature",
      normalizedClaimHash,
      normalizedPrefix,
      normalizedSignature,
      expectedSigner,
    });

    // Convert hex strings to bytes and concatenate
    const prefixBytes = ethers.utils.arrayify(normalizedPrefix);
    const claimHashBytes = ethers.utils.arrayify(normalizedClaimHash);

    // Concatenate bytes
    const messageBytes = new Uint8Array(
      prefixBytes.length + claimHashBytes.length,
    );
    messageBytes.set(prefixBytes);
    messageBytes.set(claimHashBytes, prefixBytes.length);

    // Get the digest
    const digest = ethers.utils.keccak256(messageBytes);
    log.debug({ msg: "Generated digest", digest });

    // Convert compact signature to full signature
    const parsedCompactSig = ethers.utils.splitSignature(normalizedSignature);
    const serializedSig = ethers.utils.joinSignature(parsedCompactSig);
    log.debug({ msg: "Parsed signature", serializedSig });

    // Recover the signer address
    const recoveredAddress = ethers.utils.recoverAddress(digest, serializedSig);
    const match =
      recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();

    log.debug({ msg: "Recovered address", recoveredAddress });
    log.debug({ msg: "Expected signer", expectedSigner });
    log.debug({ msg: "Match?", match });

    // Compare recovered address with expected signer
    return match;
  } catch (error) {
    return false;
  }
}

export async function verifyBroadcastRequest(
  request: BroadcastRequest,
  theCompactService: TheCompactService,
): Promise<{
  isValid: boolean;
  isOnchainRegistration: boolean;
  error?: string;
}> {
  const chainId = ensureIsSupportedChainId(request.chainId);

  log.info({
    msg: "Verifying broadcast request",
    chainId,
    sponsor: request.compact.sponsor,
    arbiter: request.compact.arbiter,
    nonce: request.compact.nonce,
    expires: request.compact.expires,
    id: request.compact.id,
    amount: request.compact.amount,
    sponsorSignature: request.sponsorSignature,
    allocatorSignature: request.allocatorSignature,
  });

  // Get chain prefix based on chainId
  const chainPrefix = metadata.chainInfo[chainId].prefix;

  // Get the claim hash from the request
  const claimHash = request.claimHash;
  if (!claimHash) {
    throw new Error("Claim hash is required for signature verification");
  }

  // Try to verify sponsor signature first
  let isSponsorValid = false;
  let registrationStatus: RegistrationStatus | null = null;
  let isOnchainRegistration = false;
  let error: string | undefined;

  try {
    log.debug({
      msg: "Attempting to verify sponsor signature",
      claimHash,
      sponsorSignature: request.sponsorSignature,
      sponsor: request.compact.sponsor,
      chainPrefix,
    });

    if (request.sponsorSignature && request.sponsorSignature !== "0x") {
      isSponsorValid = await verifySignature(
        claimHash,
        request.sponsorSignature,
        request.compact.sponsor,
        chainPrefix,
      );

      if (!isSponsorValid) {
        error = "Invalid sponsor signature provided";
      }
    } else {
      // Check registration status if no valid signature provided
      log.debug(
        "No sponsor signature provided, checking onchain registration...",
      );
      try {
        registrationStatus = await theCompactService.getRegistrationStatus(
          chainId,
          request.compact.sponsor,
          claimHash,
          COMPACT_REGISTRATION_TYPEHASH,
        );

        log.debug({
          msg: "Registration status check result",
          isActive: registrationStatus.isActive,
          expires: registrationStatus.expires?.toString(),
          compactExpires: request.compact.expires,
        });

        if (registrationStatus.isActive) {
          isSponsorValid = true;
          isOnchainRegistration = true;
        } else {
          error =
            "No sponsor signature provided (0x) and no active onchain registration found";
        }
      } catch (err) {
        log.error({
          msg: "Registration status check failed",
          error: err,
          chainId,
          sponsor: request.compact.sponsor,
          claimHash,
        });
        error = "Failed to check onchain registration status";
      }
    }
  } catch (err) {
    error = "Sponsor signature verification failed";
    log.error({ msg: error, err });
  }

  if (!isSponsorValid) {
    log.error({
      msg: "Verification failed: Invalid sponsor signature and no active registration found",
      sponsorSignaturePresent: !!request.sponsorSignature,
      registrationStatus: registrationStatus
        ? {
            isActive: registrationStatus.isActive,
            expires: registrationStatus.expires?.toString(),
          }
        : null,
    });
    return { isValid: false, isOnchainRegistration, error };
  }

  // Extract allocator ID from compact.id
  const allocatorId = extractAllocatorId(request.compact.id);
  log.debug({ msg: "Extracted allocator ID", allocatorId });

  // Find the matching allocator
  let allocatorAddress: string | undefined;
  for (const [name, allocator] of Object.entries(metadata.allocators)) {
    if (allocator.id === allocatorId) {
      allocatorAddress = allocator.signingAddress;
      log.debug({
        msg: "Found matching allocator",
        allocatorName: name,
        allocatorAddress,
      });
      break;
    }
  }

  if (!allocatorAddress) {
    const error = `No allocator found for ID: ${allocatorId}`;
    log.error(error);

    return {
      isValid: false,
      isOnchainRegistration,
      error: error,
    };
  }

  // Verify allocator signature
  const isAllocatorValid = await verifySignature(
    claimHash,
    request.allocatorSignature,
    allocatorAddress,
    chainPrefix,
  );
  if (!isAllocatorValid) {
    const error = "Invalid allocator signature";
    log.error(error);

    return {
      isValid: false,
      isOnchainRegistration,
      error,
    };
  }

  return { isValid: true, isOnchainRegistration };
}
