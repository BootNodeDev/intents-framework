import { metadata } from "../config/index.js";
import type { CompactXRule } from "../filler.js";
import type { CompactXParsedArgs } from "../types.js";

export function validateArbiterAndTribunal(): CompactXRule {
  return async (parsedArgs: CompactXParsedArgs) => {
    // Validate arbiter address
    if (
      parsedArgs.context.compact.arbiter !==
      metadata.chainInfo[parsedArgs.context.chainId].arbiter
    ) {
      return {
        error: `Unsupported arbiter address ${parsedArgs.context.compact.arbiter}, on chain ${parsedArgs.context.chainId}`,
        success: false,
      };
    }

    // Validate tribunal addresses
    if (
      parsedArgs.context.compact.mandate.tribunal !==
      metadata.chainInfo[parsedArgs.context.compact.mandate.chainId].tribunal
    ) {
      return {
        error: `Unsupported tribunal address ${parsedArgs.context.compact.mandate.tribunal}, on chain ${parsedArgs.context.compact.mandate.chainId}`,
        success: false,
      };
    }

    return { data: "Arbiter and Tribunal are Ok", success: true };
  };
}
