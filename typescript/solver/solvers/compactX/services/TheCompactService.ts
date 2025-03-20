import type { Logger } from "../../../logger.js";

import type { BigNumber } from "@ethersproject/bignumber";
import type { MultiProvider } from "@hyperlane-xyz/sdk";
import type { Address } from "@hyperlane-xyz/utils";
import { TheCompact__factory } from "../../../typechain/factories/compactX/contracts/TheCompact__factory.js";
import { metadata } from "../config/index.js";

/**
 * @notice Status of a forced withdrawal
 * @dev Maps to the contract's ForcedWithdrawalStatus enum
 */
export enum ForcedWithdrawalStatus {
  Disabled = 0, // Not pending or enabled for forced withdrawal
  Pending = 1, // Not yet available, but initiated
  Enabled = 2, // Available for forced withdrawal on demand
}

export interface RegistrationStatus {
  isActive: boolean;
  expires: BigNumber;
}

export interface ForcedWithdrawalInfo {
  status: keyof typeof ForcedWithdrawalStatus;
  availableAt: number;
}

export class TheCompactService {
  constructor(
    readonly multiProvider: MultiProvider,
    readonly log: Logger,
  ) {}

  private getReadOnlyCompactInstance(chainId: number) {
    const provider = this.multiProvider.getProvider(chainId);

    return TheCompact__factory.connect(
      metadata.chainInfo[chainId].compactX,
      provider,
    );
  }

  async hasConsumedAllocatorNonce(
    chainId: number,
    nonce: bigint,
    allocator: Address,
  ): Promise<boolean> {
    const theCompact = this.getReadOnlyCompactInstance(chainId);
    const result = await theCompact.hasConsumedAllocatorNonce(nonce, allocator);

    return result as boolean;
  }

  async getRegistrationStatus(
    chainId: number,
    sponsor: string,
    claimHash: string,
    typehash: string,
  ): Promise<RegistrationStatus> {
    try {
      this.log.debug({
        msg: "Fetching registration status for sponsor",
        sponsor,
        claimHash,
        typehash,
        chainId,
      });

      const theCompact = this.getReadOnlyCompactInstance(chainId);

      // Use explicit type assertion for the contract call result
      const { isActive, expires } = await theCompact.getRegistrationStatus(
        sponsor,
        claimHash,
        typehash,
      );

      this.log.debug({ msg: "Registration status", isActive, expires });

      return { isActive, expires } as RegistrationStatus;
    } catch (error) {
      const errorInfo = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
        // For viem errors, they often have a cause property
        cause: (error as { cause?: unknown })?.cause,
        // Some errors might have a data property with more details
        data: (error as { data?: unknown })?.data,
        // Convert the whole error to string to capture anything else
        toString: String(error),
      };

      this.log.debug({
        msg: "Error in getRegistrationStatus:",
        errorInfo,
        errorMessage: errorInfo.message,
        chainId,
        sponsor,
        claimHash,
        typehash,
      });

      throw error;
    }
  }

  async getForcedWithdrawalStatus(
    chainId: number,
    account: Address,
    lockId: bigint,
  ): Promise<ForcedWithdrawalInfo> {
    const theCompact = this.getReadOnlyCompactInstance(chainId);

    const result = await theCompact.getForcedWithdrawalStatus(account, lockId);

    const [status, availableAt] = result as [number, BigNumber];

    // Map numeric status to enum key
    const statusKey = ForcedWithdrawalStatus[
      status
    ] as keyof typeof ForcedWithdrawalStatus;

    return {
      status: statusKey,
      availableAt: Number(availableAt),
    };
  }
}
