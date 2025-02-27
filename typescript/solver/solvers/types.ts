import { isValidAddress } from "@hyperlane-xyz/utils";
import z from "zod";

export const addressSchema = z
  .string()
  .refine((address) => isValidAddress(address), {
    message: "Invalid address",
  });

export const BaseMetadataSchema = z.object({
  protocolName: z.string(),
  customRules: z
    .object({
      rules: z.array(
        z.object({
          name: z.string(),
          args: z.array(z.any()).optional(),
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
