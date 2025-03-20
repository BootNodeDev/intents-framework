import {
  type SupportedChainId,
} from "../config/constants.js";
import type { Logger } from "../../../logger.js";

import { TheCompact__factory } from "../../../typechain/factories/compactX/contracts/TheCompact__factory.js";
import type { MultiProvider } from "@hyperlane-xyz/sdk";
import type { BigNumber } from "@ethersproject/bignumber";
import { Address } from "@hyperlane-xyz/utils";

const THE_COMPACT_ADDRESS = "0x00000000000018DF021Ff2467dF97ff846E09f48";

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

  async hasConsumedAllocatorNonce(
    chainId: SupportedChainId,
    nonce: bigint,
    allocator: `0x${string}`,
  ): Promise<boolean> {
    const provider = this.multiProvider.getProvider(chainId);
    if (!provider) {
      throw new Error(`No client found for chain ${chainId}`);
    }

    const theCompact = TheCompact__factory.connect(
      THE_COMPACT_ADDRESS,
      provider,
    );
    const result = await theCompact.hasConsumedAllocatorNonce(nonce, allocator);

    return result as boolean;
  }

  async getRegistrationStatus(
    chainId: SupportedChainId,
    sponsor: string,
    claimHash: string,
    typehash: string,
  ): Promise<RegistrationStatus> {
    const provider = this.multiProvider.getProvider(chainId);
    if (!provider) {
      throw new Error(`No client found for chain ${chainId}`);
    }

    const theCompact = TheCompact__factory.connect(
      THE_COMPACT_ADDRESS,
      provider,
    );

    try {
      this.log.debug(
        `Fetching registration status for sponsor ${sponsor}, claimHash ${claimHash}, and typehash ${typehash} on chain ${chainId}`,
      );

      // Use explicit type assertion for the contract call result
      const { isActive, expires } = await theCompact.getRegistrationStatus(
        sponsor,
        claimHash,
        typehash,
      );

      this.log.debug(`Result: ${isActive}, ${expires}`);

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

      this.log.debug("Error in getRegistrationStatus:", {
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
    chainId: SupportedChainId,
    account: Address,
    lockId: bigint,
  ): Promise<ForcedWithdrawalInfo> {
    const provider = this.multiProvider.getProvider(chainId);
    if (!provider) {
      throw new Error(`No client found for chain ${chainId}`);
    }

    const theCompact = TheCompact__factory.connect(
      THE_COMPACT_ADDRESS,
      provider,
    );

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

  // async enableForcedWithdrawal(
  //   chainId: SupportedChainId,
  //   lockId: bigint
  // ): Promise<`0x${string}`> {
  //   this.log.debug(
  //     `Preparing to enable forced withdrawal for lock ${lockId} on chain ${chainId}`
  //   );

  //   const publicClient = this.publicClients[chainId];
  //   const walletClient = this.walletClients[chainId];

  //   if (!publicClient || !walletClient) {
  //     throw new Error(`No clients found for chain ${chainId}`);
  //   }

  //   // Get the account from the wallet client
  //   const account = walletClient.account;
  //   if (!account) {
  //     throw new Error("No account found in wallet client");
  //   }

  //   this.log.debug(`Using account ${account.address} for forced withdrawal`);

  //   // Encode the function call
  //   const data = encodeFunctionData({
  //     abi: THE_COMPACT_ABI,
  //     functionName: "enableForcedWithdrawal",
  //     args: [lockId],
  //   });

  //   this.log.debug(`Encoded enableForcedWithdrawal call for lock ${lockId}`);

  //   // Get base fee
  //   const baseFee = await publicClient
  //     .getBlock({ blockTag: "latest" })
  //     .then(
  //       (block: { baseFeePerGas: bigint | null }) => block.baseFeePerGas || 0n
  //     );

  //     this.log.debug(`Got base fee for chain ${chainId}: ${baseFee}`);

  //   // Submit the transaction
  //   this.log.debug(
  //     `Submitting enableForcedWithdrawal transaction for lock ${lockId}`
  //   );
  //   const hash = await walletClient.sendTransaction({
  //     to: THE_COMPACT_ADDRESS,
  //     data,
  //     account,
  //     chain: null,
  //     maxFeePerGas: (baseFee * 120n) / 100n,
  //     maxPriorityFeePerGas: CHAIN_PRIORITY_FEES[chainId],
  //   });

  //   this.log.debug(
  //     `Successfully submitted enableForcedWithdrawal transaction for lock ${lockId} on chain ${chainId}: ${hash}`
  //   );

  //   return hash;
  // }

  // async executeForcedWithdrawal(
  //   chainId: SupportedChainId,
  //   lockId: bigint,
  //   amount: bigint
  // ): Promise<`0x${string}`> {
  //   this.log.debug(
  //     `Preparing to execute forced withdrawal for lock ${lockId} on chain ${chainId}`,
  //     { amount: amount.toString() }
  //   );

  //   const publicClient = this.publicClients[chainId];
  //   const walletClient = this.walletClients[chainId];

  //   if (!publicClient || !walletClient) {
  //     throw new Error(`No clients found for chain ${chainId}`);
  //   }

  //   // Get the account from the wallet client
  //   const account = walletClient.account;
  //   if (!account) {
  //     throw new Error("No account found in wallet client");
  //   }

  //   this.log.debug(`Using account ${account.address} for forced withdrawal`);

  //   // Double check that forced withdrawal is enabled
  //   const { status } = await this.getForcedWithdrawalStatus(
  //     chainId,
  //     account.address,
  //     lockId
  //   );

  //   if (status !== "Enabled") {
  //     throw new Error(
  //       `Forced withdrawal not enabled for lock ${lockId} on chain ${chainId}. ` +
  //         `Current status: ${status} (${ForcedWithdrawalStatus[status as keyof typeof ForcedWithdrawalStatus]})`
  //     );
  //   }

  //   // Encode the function call
  //   const data = encodeFunctionData({
  //     abi: THE_COMPACT_ABI,
  //     functionName: "forcedWithdrawal",
  //     args: [lockId, account.address, amount],
  //   });

  //   this.log.debug(`Encoded forcedWithdrawal call for lock ${lockId}`);

  //   // Get base fee
  //   const baseFee = await publicClient
  //     .getBlock({ blockTag: "latest" })
  //     .then(
  //       (block: { baseFeePerGas: bigint | null }) => block.baseFeePerGas || 0n
  //     );

  //     this.log.debug(`Got base fee for chain ${chainId}: ${baseFee}`);

  //   // Submit the transaction
  //   this.log.debug(`Submitting forcedWithdrawal transaction for lock ${lockId}`, {
  //     amount: amount.toString(),
  //   });
  //   const hash = await walletClient.sendTransaction({
  //     to: THE_COMPACT_ADDRESS,
  //     data,
  //     account,
  //     chain: null,
  //     maxFeePerGas: (baseFee * 120n) / 100n,
  //     maxPriorityFeePerGas: CHAIN_PRIORITY_FEES[chainId],
  //   });

  //   this.log.debug(
  //     `Successfully submitted forcedWithdrawal transaction for lock ${lockId} on chain ${chainId}: ${hash}`,
  //     { amount: amount.toString() }
  //   );

  //   return hash;
  // }

  // public getPublicClient(chainId: SupportedChainId) {
  //   return this.publicClients[chainId];
  // }
}
