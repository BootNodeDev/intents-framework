import { metadata } from "../config/index.js";
import type { CompactXRule } from "../filler.js";
import type { CompactXParsedArgs } from "../types.js";
import { getChainSupportedTokens } from "../utils.js";

export function validateChainsAndTokens(): CompactXRule {
  return async (parsedArgs: CompactXParsedArgs) => {
    // Validate origin chain ID
    if (!(parsedArgs.context.chainId in metadata.chainInfo)) {
      return {
        error: `Origin ${parsedArgs.context.chainId} is not supported`,
        success: false,
      };
    }

    // Validate destination chain ID
    if (!(parsedArgs.context.compact.mandate.chainId in metadata.chainInfo)) {
      return {
        error: `Destination ${parsedArgs.context.compact.mandate.chainId} is not supported`,
        success: false,
      };
    }

    // Validate claim token
    const claimToken = `0x${BigInt(parsedArgs.context.compact.id).toString(16).slice(-40)}`;
    const originChainTokens = getChainSupportedTokens(
      parsedArgs.context.chainId,
    );

    if (
      !Object.entries(originChainTokens).some(
        ([, { address }]) => claimToken === address,
      )
    ) {
      return {
        error: `Claim token not supported ${claimToken}, on chain ${parsedArgs.context.chainId}`,
        success: false,
      };
    }

    // Validate destination token
    const mandateToken = parsedArgs.context.compact.mandate.token.toLowerCase();
    const mandateChainTokens = getChainSupportedTokens(
      parsedArgs.context.compact.mandate.chainId,
    );

    if (
      !Object.entries(mandateChainTokens).some(
        ([, { address }]) => mandateToken === address,
      )
    ) {
      return {
        error: `Destination token not supported ${mandateToken}, on chain ${parsedArgs.context.compact.mandate.chainId}`,
        success: false,
      };
    }

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

    return { data: "Chains and tokens are Ok", success: true };
  };
}
