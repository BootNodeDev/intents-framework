import { chainMetadata } from "@hyperlane-xyz/registry";
import { MultiProvider } from "@hyperlane-xyz/sdk";
import { ensure0x } from "@hyperlane-xyz/utils";
import { password } from "@inquirer/prompts";
import { isHexString } from "@ethersproject/bytes";

import { MNEMONIC, PRIVATE_KEY } from "../config/index.js";
import { NonceKeeperWallet } from "../NonceKeeperWallet.js";

export async function getMultiProvider() {
  const multiProvider = new MultiProvider(chainMetadata);
  const wallet = await getSigner();

  multiProvider.setSharedSigner(wallet);

  return multiProvider;
}

export async function getSigner() {
  const key = await retrieveKey();
  const signer = privateKeyToSigner(key);
  return signer;
}

function privateKeyToSigner(key: string) {
  if (!key) throw new Error("No private key provided");

  const formattedKey = key.trim().toLowerCase();
  if (isHexString(ensure0x(formattedKey))) {
    return new NonceKeeperWallet(ensure0x(formattedKey)) as NonceKeeperWallet;
  }

  if (formattedKey.split(" ").length >= 6) {
    return NonceKeeperWallet.fromMnemonic(formattedKey) as NonceKeeperWallet;
  }

  throw new Error("Invalid private key format");
}

async function retrieveKey() {
  if (PRIVATE_KEY) {
    return PRIVATE_KEY;
  }
  if (MNEMONIC) {
    return MNEMONIC;
  }
  return password({
    message: `Please enter private key or mnemonic.`,
  });
}
