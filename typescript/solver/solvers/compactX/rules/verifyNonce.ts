import type { CompactXRule } from "../filler.js";
import { TheCompactService } from "../services/TheCompactService.js";
import { log } from "../utils.js";

export function verifyNonce(): CompactXRule {
  return async (parsedArgs, context) => {
    const theCompactService = new TheCompactService(context.multiProvider, log);

    const nonceConsumed = await theCompactService.hasConsumedAllocatorNonce(
      +parsedArgs.context.chainId,
      BigInt(parsedArgs.context.compact.nonce),
      parsedArgs.context.compact.arbiter,
    );

    if (nonceConsumed) {
      return {
        error: "Nonce has already been consumed",
        success: false,
      };
    }

    return { data: "Nonce is Ok", success: true };
  };
}
