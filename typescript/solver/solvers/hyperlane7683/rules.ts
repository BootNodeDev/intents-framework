import z from "zod";
import {
  bytes32ToAddress,
} from "@hyperlane-xyz/utils";

import { Hyperlane7683__factory } from "../../typechain/factories/hyperlane7683/contracts/Hyperlane7683__factory.js";

import { Hyperlane7683Rule } from "./filler.js"

export const intentNotFilled: Hyperlane7683Rule = async (parsedArgs, context) => {
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

  const UNKNOWN =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

  const orderStatus = await destination.orderStatus(parsedArgs.orderId);

  if (orderStatus !== UNKNOWN) {
    return { error: "Intent already filled", success: false };
  }
  return { data: "Intent not yet filled", success: true };
};

const FilterByTokenAndAmountArgs = z.union([
  z.tuple([
    z.record(z.string(), z.array(z.string()).nonempty()),
    z.bigint().optional().refine(max => !max || max> 0n, {message: "Invalid maxAmount"})
  ]),
  z.tuple([
    z.record(z.string(), z.array(z.string()).nonempty())
  ])
])

export const filterByTokenAndAmount = (args: z.infer<typeof FilterByTokenAndAmountArgs>) => {
  FilterByTokenAndAmountArgs.parse(args);

  const [allowedTokens, maxAmount] = args;

  const rule: Hyperlane7683Rule = async (parsedArgs) => {
    const tokenIn = bytes32ToAddress(
      parsedArgs.resolvedOrder.minReceived[0].token,
    );
    const amountIn = parsedArgs.resolvedOrder.minReceived[0].amount;
    const originChainId =
      parsedArgs.resolvedOrder.minReceived[0].chainId.toString();

    const tokenOut = bytes32ToAddress(parsedArgs.resolvedOrder.maxSpent[0].token);
    const amountOut = parsedArgs.resolvedOrder.maxSpent[0].amount;
    const destChainId = parsedArgs.resolvedOrder.maxSpent[0].chainId.toString();

    if (
      !allowedTokens[originChainId] || !allowedTokens[originChainId].includes(tokenIn) ||
      !allowedTokens[destChainId] || !allowedTokens[destChainId].includes(tokenOut) ||
      (
        maxAmount && (
          amountIn.lt(amountOut) ||
          amountOut.gt(maxAmount.toString())
        )
      )
    ) {
      return { error: "Amounts and tokens are not ok", success: false };
    }

    return { data: "Amounts and tokens are ok", success: true };
  }

  return rule;
}
