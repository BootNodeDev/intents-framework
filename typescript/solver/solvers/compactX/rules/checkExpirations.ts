import { metadata } from "../config/index.js";
import { CompactXRule } from "../filler.js";

export function checkExpirations(): CompactXRule {
  return async (parsedArgs) => {
    const chainId = parsedArgs.context.chainId;

    // Check if either compact or mandate has expired or is close to expiring
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
    const { compactExpirationBuffer, mandateExpirationBuffer } =
      metadata.chainInfo[chainId];

    if (
      BigInt(parsedArgs.context.compact.expires) <=
      currentTimestamp + compactExpirationBuffer
    ) {
      return {
        error: `Compact must have at least ${compactExpirationBuffer} seconds until expiration`,
        success: false,
      };
    }

    if (
      BigInt(parsedArgs.context.compact.mandate.expires) <=
      currentTimestamp + mandateExpirationBuffer
    ) {
      return {
        error: `Mandate must have at least ${mandateExpirationBuffer} seconds until expiration`,
        success: false,
      };
    }

    return { data: "Intent is not expired", success: true };
  };
}
