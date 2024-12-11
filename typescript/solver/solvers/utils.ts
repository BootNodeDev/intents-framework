import { MultiProvider } from "@hyperlane-xyz/sdk";
import type { ChainMap, ChainMetadata } from "@hyperlane-xyz/sdk";
import { ensure0x } from "@hyperlane-xyz/utils";

import { MNEMONIC, PRIVATE_KEY } from "../config/index.js";
import { NonceKeeperWallet } from "../NonceKeeperWallet.js";

export function getMultiProvider(chainMetadata: ChainMap<ChainMetadata>) {
  if (!PRIVATE_KEY && !MNEMONIC) {
    throw new Error("Either a private key or mnemonic must be provided");
  }

  const multiProvider = new MultiProvider(chainMetadata);
  const wallet = (
    PRIVATE_KEY
      ? new NonceKeeperWallet(ensure0x(PRIVATE_KEY))
      : NonceKeeperWallet.fromMnemonic(MNEMONIC!)
  ) as NonceKeeperWallet;

  multiProvider.setSharedSigner(wallet);

  return multiProvider;
}
