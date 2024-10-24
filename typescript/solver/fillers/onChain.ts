import { Contract } from "@ethersproject/contracts";
import { Wallet } from "@ethersproject/wallet";
import { ensure0x } from "@hyperlane-xyz/utils";

import DESTINATION_SETTLER_ABI from "../abi/destinationSettler";

import type { OpenEventArgs } from "../types";

const create = () => {
  const { wallet } = setup();

  return async function onChain({ orderId, resolvedOrder }: OpenEventArgs) {
    const { maxSpent: outputs, minReceived: inputs, fillInstructions } = resolvedOrder;

    // It's still not clear if there MUST be an input for every output, so maybe it doesn't make any
    // sense to think about it this way, but we somehow need decide whether exchanging `inputs` for
    // `outputs` is a good deal for us.
    await Promise.all(inputs.map(async (input, index): Promise<void> => {
      const output = outputs[index];
      console.log(input.token, input.amount, output.token, output.amount);
    }));

    // We're assuming the filler will pay out of their own stock, but in reality they may have to
    // produce the funds before executing each leg.
    await Promise.all(outputs.map(async (output): Promise<void> => {
      // const multiProvider = new MultiProvider(chainMetadata);
      // const filler = multiProvider.setSharedSigner(wallet);

      // Check filler has at least output.amount of output.token available for executing this leg.
      console.log(wallet.address, output.token, output.amount);
    }));

    await Promise.all(outputs.map(async (output, index): Promise<void> => {
      // const multiProvider = new MultiProvider(chainMetadata);
      // const filler = multiProvider.setSharedSigner(wallet);

      const destinationSettler = fillInstructions[index].destinationSettler;
      const destination = new Contract(destinationSettler, DESTINATION_SETTLER_ABI, wallet);

      const originData = fillInstructions[index].originData;
      // Depending on the implementation we may call `destination.fill` directly or call some other
      // contract that will produce the funds needed to execute this leg and then in turn call
      // `destination.fill`
      await destination.fill(orderId, originData, "");
    }));
  }
}

function setup() {
  const privateKey = process.env.PRIVATE_KEY;
  const mnemonic = process.env.MNEMONIC;

  if (!privateKey || !mnemonic) {
    throw new Error("Either a private key or mnemonic must be provided");
  }

  const wallet = privateKey ? new Wallet(ensure0x(privateKey)) : Wallet.fromMnemonic(mnemonic);

  return { wallet };
}

export const onChain = { create };

