import type { Provider } from "@ethersproject/providers";
import { chainMetadata } from "@hyperlane-xyz/registry";
import { MultiProvider } from "@hyperlane-xyz/sdk";
import type { Contract, Signer } from "ethers";

import type { Logger } from "../logger.js";
import type { TypedEvent, TypedListener } from "../typechain/common.js";

export abstract class BaseListener<
  TContract extends Contract,
  TEvent extends TypedEvent,
  TParsedArgs,
> {
  protected constructor(
    private readonly contractFactory: {
      connect(address: string, signerOrProvider: Signer | Provider): TContract;
    },
    private readonly eventName: Extract<keyof TContract["filters"], string>,
    private readonly metadata: { address: string; chainId: number },
    private readonly log: Logger,
  ) {}

  protected setup(): TContract {
    if (!this.metadata.address || !this.metadata.chainId) {
      throw new Error("Origin contract information must be provided");
    }

    const multiProvider = new MultiProvider(chainMetadata);
    const provider = multiProvider.getProvider(this.metadata.chainId);

    return this.contractFactory.connect(this.metadata.address, provider);
  }

  create() {
    const contract = this.setup();

    return (handler: (args: TParsedArgs) => void) => {
      const filter = contract.filters[this.eventName]();

      const listener: TypedListener<TEvent> = (...args) => {
        handler(this.parseEventArgs(args));
      };

      contract.on(filter, listener);

      contract.provider.getNetwork().then((network) => {
        this.log.info(
          `Started listening for ${this.eventName} events on`,
          Object.values(chainMetadata).find(
            (metadata) => metadata.chainId === network.chainId,
          )?.displayName,
        );
      });
    };
  }

  protected abstract parseEventArgs(
    args: Parameters<TypedListener<TEvent>>,
  ): TParsedArgs;
}
