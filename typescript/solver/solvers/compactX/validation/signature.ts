import ethers from "ethers";

import type { SupportedChainId } from "../config/constants.js";
import type { TheCompactService, RegistrationStatus } from "../services/TheCompactService.js";
import type { BroadcastRequest } from "../types.js";

// Chain-specific prefixes for signature verification
const CHAIN_PREFIXES = {
  1: "0x1901afbd5f3d34c216b31ba8b82d0b32ae91e4edea92dd5bbf4c1ad028f72364a211", // ethereum
  10: "0x1901ea25de9c16847077fe9d95916c29598dc64f4850ba02c5dbe7800d2e2ecb338e", // optimism
  8453: "0x1901a1324f3bfe91ee592367ae7552e9348145e65b410335d72e4507dcedeb41bf52", // base
  130: "0x190150e2b173e1ac2eac4e4995e45458f4cd549c256c423a041bf17d0c0a4a736d2c", // unichain
} as const;

// Allocator address for signature verification
const ALLOCATOR_ADDRESS = "0x51044301738Ba2a27bd9332510565eBE9F03546b";

// The Compact typehash for registration checks
const COMPACT_REGISTRATION_TYPEHASH =
  "0x27f09e0bb8ce2ae63380578af7af85055d3ada248c502e2378b85bc3d05ee0b0" as const;

async function verifySignature(
  claimHash: string,
  signature: string,
  expectedSigner: string,
  chainPrefix: string
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

    // Convert hex strings to bytes and concatenate
    const prefixBytes = ethers.utils.arrayify(normalizedPrefix);
    const claimHashBytes = ethers.utils.arrayify(normalizedClaimHash);

    // Concatenate bytes
    const messageBytes = new Uint8Array(
      prefixBytes.length + claimHashBytes.length
    );
    messageBytes.set(prefixBytes);
    messageBytes.set(claimHashBytes, prefixBytes.length);

    // Get the digest
    const digest = ethers.utils.keccak256(messageBytes);

    // Convert compact signature to full signature
    const parsedCompactSig = ethers.utils.splitSignature(normalizedSignature);
    const serializedSig = ethers.utils.joinSignature(parsedCompactSig);

    // Recover the signer address
    const recoveredAddress = ethers.utils.recoverAddress(digest, serializedSig);

    // Compare recovered address with expected signer
    return recoveredAddress.toLowerCase() === expectedSigner.toLowerCase();
  } catch (error) {
    return false;
  }
}

export async function verifyBroadcastRequest(
  request: BroadcastRequest,
  theCompactService: TheCompactService
): Promise<{
  isValid: boolean;
  isOnchainRegistration: boolean;
  error?: string;
}> {
  const chainId = Number.parseInt(
    request.chainId.toString()
  ) as SupportedChainId;

  // Get chain prefix based on chainId
  const chainPrefix = CHAIN_PREFIXES[chainId];
  if (!chainPrefix) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

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
    if (request.sponsorSignature && request.sponsorSignature !== "0x") {
      isSponsorValid = await verifySignature(
        claimHash,
        request.sponsorSignature,
        request.compact.sponsor,
        chainPrefix
      );

      if (!isSponsorValid) {
        error = "Invalid sponsor signature provided";
      }
    } else {
      // Check registration status if no valid signature provided
      try {
        registrationStatus = await theCompactService.getRegistrationStatus(
          chainId,
          request.compact.sponsor as `0x${string}`,
          claimHash as `0x${string}`,
          COMPACT_REGISTRATION_TYPEHASH as `0x${string}`
        );

        if (registrationStatus.isActive) {
          isSponsorValid = true;
          isOnchainRegistration = true;
        } else {
          error =
            "No sponsor signature provided (0x) and no active onchain registration found";
        }
      } catch (err) {
        error = "Failed to check onchain registration status";
      }
    }
  } catch (err) {
    error = "Sponsor signature verification failed";
  }

  if (!isSponsorValid) {
    return { isValid: false, isOnchainRegistration, error };
  }

  // Verify allocator signature
  const isAllocatorValid = await verifySignature(
    claimHash,
    request.allocatorSignature,
    ALLOCATOR_ADDRESS,
    chainPrefix
  );
  if (!isAllocatorValid) {
    throw new Error("Invalid allocator signature");
  }

  return { isValid: true, isOnchainRegistration };
}
