import { bytes32ToAddress } from "@hyperlane-xyz/utils";
import z from "zod";

import { Hyperlane7683Rule } from "../filler.js";

const FilterByTokenAndAmountArgs = z.union([
  z.tuple([
    z.record(z.string(), z.array(z.string()).nonempty()),
    z
      .bigint()
      .optional()
      .refine((max) => !max || max > 0n, { message: "Invalid maxAmount" }),
  ]),
  z.tuple([z.record(z.string(), z.array(z.string()).nonempty())]),
]);

export function filterByTokenAndAmount(
  args: z.infer<typeof FilterByTokenAndAmountArgs>,
): Hyperlane7683Rule {
  FilterByTokenAndAmountArgs.parse(args);

  const [allowedTokens, maxAmount] = args;

  return async (parsedArgs) => {
    const tokenIn = bytes32ToAddress(
      parsedArgs.resolvedOrder.minReceived[0].token,
    );
    const amountIn = parsedArgs.resolvedOrder.minReceived[0].amount;
    const originChainId =
      parsedArgs.resolvedOrder.minReceived[0].chainId.toString();

    const tokenOut = bytes32ToAddress(
      parsedArgs.resolvedOrder.maxSpent[0].token,
    );
    const amountOut = parsedArgs.resolvedOrder.maxSpent[0].amount;
    const destChainId = parsedArgs.resolvedOrder.maxSpent[0].chainId.toString();

    if (
      !allowedTokens[originChainId] ||
      !allowedTokens[originChainId].includes(tokenIn) ||
      !allowedTokens[destChainId] ||
      !allowedTokens[destChainId].includes(tokenOut) ||
      (maxAmount &&
        (amountIn.lt(amountOut) || amountOut.gt(maxAmount.toString())))
    ) {
      return { error: "Amounts and tokens are not ok", success: false };
    }

    return { data: "Amounts and tokens are ok", success: true };
  };
}
