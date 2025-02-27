import { HashZero } from "@ethersproject/constants";
import { bytes32ToAddress } from "@hyperlane-xyz/utils";

import { Hyperlane7683__factory } from "../../../typechain/factories/hyperlane7683/contracts/Hyperlane7683__factory.js";
import { Hyperlane7683Rule } from "../filler.js";

const UNKNOWN = HashZero;

export function intentNotFilled(): Hyperlane7683Rule {
  return async (parsedArgs, context) => {
    const destinationSettler = bytes32ToAddress(
      parsedArgs.resolvedOrder.fillInstructions[0].destinationSettler,
    );
    const _chainId =
      parsedArgs.resolvedOrder.fillInstructions[0].destinationChainId.toString();
    const filler = await context.multiProvider.getSigner(_chainId);

    const destination = Hyperlane7683__factory.connect(
      destinationSettler,
      filler,
    );

    const orderStatus = await destination.orderStatus(parsedArgs.orderId);

    if (orderStatus !== UNKNOWN) {
      return { error: "Intent already filled", success: false };
    }
    return { data: "Intent not yet filled", success: true };
  };
}
