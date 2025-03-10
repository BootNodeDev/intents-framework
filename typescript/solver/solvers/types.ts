import { isValidAddress } from "@hyperlane-xyz/utils";
import z from "zod";

import { chainNames } from "../config/index.js";

export const addressSchema = z
  .string()
  .refine((address) => isValidAddress(address), {
    message: "Invalid address",
  });

export const BaseMetadataSchema = z.object({
  protocolName: z.string(),
  intentSources: z.array(
    z.object({
      address: addressSchema,
      chainName: z.string().refine((name) => chainNames.includes(name), {
        message: "Invalid chainName",
      }),
      pollInterval: z.number().optional(),
      confirmationBlocks: z.number().optional(),
      initialBlock: z.number().optional(),
      processedIds: z.array(z.string()).optional(),
    }),
  ),
  customRules: z
    .object({
      rules: z.array(
        z.object({
          name: z.string(),
          args: z.any().optional(),
        }),
      ),
      keepBaseRules: z.boolean().optional(),
    })
    .optional(),
});

export type BaseMetadata = z.infer<typeof BaseMetadataSchema>;

export type RulesMap<TRule> = Record<string, (args?: any) => TRule>;

export type BuildRules<TRule> = {
  base?: Array<TRule>;
  custom?: RulesMap<TRule>;
};

export interface BaseIntentData {
  // Base fields that all intent data should have
}
