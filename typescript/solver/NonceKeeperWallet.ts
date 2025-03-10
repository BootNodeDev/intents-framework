import { defaultPath, HDNode } from "@ethersproject/hdnode";
import type { Deferrable } from "@ethersproject/properties";
import type {
  Provider,
  TransactionRequest,
  TransactionResponse,
} from "@ethersproject/providers";
import { Wallet } from "@ethersproject/wallet";
import type { Wordlist } from "@ethersproject/wordlists";

import { Logger } from "@ethersproject/logger";
const ethersLogger = new Logger("NonceKeeperWallet");

import { log } from "./logger.js";

const nonces: Record<number, Promise<number>> = {};

export class NonceKeeperWallet extends Wallet {
  connect(provider: Provider): NonceKeeperWallet {
    return new NonceKeeperWallet(this, provider);
  }

  async getNextNonce(): Promise<number> {
    const chainId = await this.getChainId();
    nonces[chainId] ||= super.getTransactionCount();
    const nonce = nonces[chainId];
    nonces[chainId] = nonces[chainId].then((nonce) => nonce + 1);

    return nonce;
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>,
  ): Promise<TransactionResponse> {
    try {
      // this check is necessary in order to not generate new nonces when a tx is going to fail
      await super.estimateGas(transaction);
    } catch (error) {
      checkError(error, {transaction});
    }

    if (transaction.nonce == null) {
      transaction.nonce = await this.getNextNonce();
    }

    log.debug({ msg: "transaction", transaction });

    return super.sendTransaction(transaction);
  }

  static override fromMnemonic(
    mnemonic: string,
    path?: string,
    wordlist?: Wordlist,
  ) {
    if (!path) {
      path = defaultPath;
    }

    return new NonceKeeperWallet(
      HDNode.fromMnemonic(mnemonic, undefined, wordlist).derivePath(path),
    );
  }
}

function checkError(error: any, params: any): any {
  const transaction = params.transaction || params.signedTransaction;

  let message = error.message;
  if (error.code === Logger.errors.SERVER_ERROR && error.error && typeof(error.error.message) === "string") {
      message = error.error.message;
  } else if (typeof(error.body) === "string") {
      message = error.body;
  } else if (typeof(error.responseText) === "string") {
      message = error.responseText;
  }
  message = (message || "").toLowerCase();

  // "insufficient funds for gas * price + value + cost(data)"
  if (message.match(/insufficient funds|base fee exceeds gas limit/i)) {
      ethersLogger.throwError("insufficient funds for intrinsic transaction cost", Logger.errors.INSUFFICIENT_FUNDS, {
          error, transaction
      });
  }

  // "nonce too low"
  if (message.match(/nonce (is )?too low/i)) {
      ethersLogger.throwError("nonce has already been used", Logger.errors.NONCE_EXPIRED, {
          error, transaction
      });
  }

  // "replacement transaction underpriced"
  if (message.match(/replacement transaction underpriced|transaction gas price.*too low/i)) {
      ethersLogger.throwError("replacement fee too low", Logger.errors.REPLACEMENT_UNDERPRICED, {
          error, transaction
      });
  }

  // "replacement transaction underpriced"
  if (message.match(/only replay-protected/i)) {
      ethersLogger.throwError("legacy pre-eip-155 transactions not supported", Logger.errors.UNSUPPORTED_OPERATION, {
          error, transaction
      });
  }

  if (message.match(/gas required exceeds allowance|always failing transaction|execution reverted/)) {
      ethersLogger.throwError("cannot estimate gas; transaction may fail or may require manual gas limit", Logger.errors.UNPREDICTABLE_GAS_LIMIT, {
          error, transaction
      });
  }

  throw error;
}
