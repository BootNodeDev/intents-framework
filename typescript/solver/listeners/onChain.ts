import { Contract } from '@ethersproject/contracts';
import { chainMetadata } from '@hyperlane-xyz/registry';
import { MultiProvider } from '@hyperlane-xyz/sdk';

import ORIGIN_SETTLER_ABI from '../abi/originSettler';
import type { OpenEvent, OpenEventArgs } from '../types';

const create = () => {
  const { settlerContract } = setup();

  return function onChain(handler: (openEventArgs: OpenEventArgs) => void) {
    settlerContract.on(settlerContract.filters.Open(), (log: OpenEvent) => {
      const orderId = log.args.orderId;
      const resolvedOrder = log.args.resolvedOrder;

      handler({ orderId, resolvedOrder });
    });
  }
}

function setup() {
  const address = process.env.ORIGIN_SETTLER_ADDRESS;
  const chainId = process.env.ORIGIN_SETTLER_CHAIN_ID;

  if (!address || !chainId) {
    throw new Error("Origin settler information must be provided");
  }

  const multiProvider = new MultiProvider(chainMetadata);
  const provider = multiProvider.getProvider(chainId);

  const settlerContract = new Contract(address, ORIGIN_SETTLER_ABI, provider);

  return { settlerContract };
}

export const onChain = { create };