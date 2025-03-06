import { MaxUint256 } from "@ethersproject/constants";
import { bytes32ToAddress } from "@hyperlane-xyz/utils";
import z from "zod";

import { Hyperlane7683Rule } from "../filler.js";

const FilterByTokenAndAmountArgs = z.record(
  z.string(),
  z.record(
    z.string(),
    z.union([
      z.null(),
      z.bigint().refine((max) => max > 0n, { message: "Invalid Max Amount" }),
    ]),
  ),
);

export function filterByTokenAndAmount(
  args: z.infer<typeof FilterByTokenAndAmountArgs>,
): Hyperlane7683Rule {
  FilterByTokenAndAmountArgs.parse(args);

  const allowedTokens: Record<string, string[]> = {};
  
  for (const [chainId, tokens] of Object.entries(args)) {
    allowedTokens[chainId] = [];

    for (const token of Object.keys(tokens)) {
      allowedTokens[chainId].push(token.toLowerCase());
    }
  }

  return async (parsedArgs) => {
    const tokenIn = bytes32ToAddress(
      parsedArgs.resolvedOrder.minReceived[0].token,
    );
    const originChainId =
      parsedArgs.resolvedOrder.minReceived[0].chainId.toString();

    const tokenOut = bytes32ToAddress(
      parsedArgs.resolvedOrder.maxSpent[0].token,
    );
    const destChainId = parsedArgs.resolvedOrder.maxSpent[0].chainId.toString();

    if (
      !allowedTokens[originChainId] ||
      !allowedTokens[originChainId].includes(tokenIn.toLowerCase())
    ) {
      return { error: "Input token is not allowed", success: false };
    }

    if (
      !allowedTokens[destChainId] ||
      !allowedTokens[destChainId].includes(tokenOut.toLowerCase())
    ) {
      return { error: "Output token is not allowed", success: false };
    }

    let maxAmount = args[originChainId][tokenIn];

    if (maxAmount === null) {
      maxAmount = BigInt(MaxUint256.toString());
    }

    const amountIn = parsedArgs.resolvedOrder.minReceived[0].amount;
    const amountOut = parsedArgs.resolvedOrder.maxSpent[0].amount;

    if (amountIn.lte(amountOut)) {
      return { error: "Intent is not profitable", success: false };
    }
    
    if (amountOut.gt(maxAmount.toString())) {
      return { error: "Output amount exceeds the maximum allowed", success: false };
    }

    return { data: "Amounts and tokens are Ok", success: true };
  };
}
