import { Tribunal__factory } from "../../../typechain/factories/compactX/contracts/Tribunal__factory.js";
import type { CompactXRule } from "../filler.js";
import { deriveClaimHash } from "../utils.js";

export function intentNotFilled(): CompactXRule {
  return async (parsedArgs, context) => {
    // Derive and log claim hash
    const claimHash = deriveClaimHash(parsedArgs.context.compact);

    const tribunal = Tribunal__factory.connect(
      parsedArgs.context.compact.mandate.tribunal,
      context.multiProvider.getSigner(
        parsedArgs.context.compact.mandate.chainId,
      ),
    );

    const isFilled = await tribunal.filled(claimHash);

    context.log.info({
      msg: "Intent filled status",
      isFilled,
    });

    if (isFilled) {
      return { error: "Intent already filled", success: false };
    }

    return { data: "Intent not yet filled", success: true };
  };
}
