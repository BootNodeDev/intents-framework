import { z } from "zod";

import { ParsedArgs } from "../BaseFiller.js";
import { BaseMetadataSchema, BaseWebSocketSourceSchema } from "../types.js";

// Custom validators and constants
const isHexString = (str: string) => /^0x[0-9a-fA-F]*$/.test(str);
const isAddress = (str: string) => isHexString(str) && str.length === 42; // 0x + 40 chars (20 bytes)
const isHash = (str: string) => isHexString(str) && str.length === 66; // 0x + 64 chars (32 bytes)
const is64ByteHex = (str: string) => isHexString(str) && str.length === 130; // 0x + 128 chars (64 bytes)
const isEmptyHex = (str: string) => str === "0x";
const isNumericString = (str: string) => /^-?\d+$/.test(str);
const isNumericOrHexString = (str: string) =>
  isNumericString(str) || isHexString(str);
const UINT32_MAX = 4294967295; // 2^32 - 1

const numericOrHexSchema = z.string().refine(isNumericOrHexString, {
  message: "Must be either a numeric string or a hex string with 0x prefix",
});

const addressSchema = z
  .string()
  .refine(isAddress, {
    message: "Must be a valid Ethereum address (0x prefix + 20 bytes)",
  })
  .transform((addr) => addr.toLowerCase());

const hashSchema = z.string().refine(isHash, {
  message: "Must be a valid hash (0x prefix + 32 bytes)",
});

// Type definitions
export const MandateSchema = z.object({
  chainId: z
    .number()
    .int()
    .min(1)
    .max(UINT32_MAX)
    .refine(
      (n) => n >= 1 && n <= UINT32_MAX,
      `Chain ID must be between 1 and ${UINT32_MAX}`,
    ),
  tribunal: addressSchema,
  recipient: addressSchema,
  expires: numericOrHexSchema,
  token: addressSchema,
  minimumAmount: numericOrHexSchema,
  baselinePriorityFee: numericOrHexSchema,
  scalingFactor: numericOrHexSchema,
  salt: hashSchema,
});

export const CompactMessageSchema = z.object({
  arbiter: addressSchema,
  sponsor: addressSchema,
  nonce: hashSchema,
  expires: numericOrHexSchema,
  id: numericOrHexSchema,
  amount: numericOrHexSchema,
  mandate: MandateSchema,
});

export const ContextSchema = z.object({
  dispensation: numericOrHexSchema,
  dispensationUSD: z.string(),
  spotOutputAmount: numericOrHexSchema,
  quoteOutputAmountDirect: numericOrHexSchema,
  quoteOutputAmountNet: numericOrHexSchema,
  deltaAmount: numericOrHexSchema.optional(),
  slippageBips: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .refine(
      (n) => n >= 0 && n <= 10000,
      "Slippage must be between 0 and 10000 basis points",
    )
    .optional(),
  witnessTypeString: z.string(),
  witnessHash: hashSchema,
  claimHash: hashSchema.optional(),
});

export const BroadcastRequestSchema = z.object({
  chainId: numericOrHexSchema,
  compact: CompactMessageSchema,
  sponsorSignature: z
    .string()
    .refine(
      (str) => str === null || isEmptyHex(str) || is64ByteHex(str),
      "Sponsor signature must be null, 0x, or a 64-byte hex string",
    )
    .nullable(),
  allocatorSignature: z
    .string()
    .refine(is64ByteHex, "Allocator signature must be a 64-byte hex string"),
  context: ContextSchema,
  claimHash: hashSchema.optional(),
});

export type BroadcastRequest = z.infer<typeof BroadcastRequestSchema>;

export const CompactXMetadataSchema = BaseMetadataSchema.extend({
  intentSources: z
    .object({
      webSockets: z.array(BaseWebSocketSourceSchema),
    })
    .strict(),
  chainInfo: z.record(
    z.string(),
    z.object({
      arbiter: addressSchema,
      tribunal: addressSchema,
      compactX: addressSchema,
      prefix: z.string(),
      priorityFee: z.bigint(),
      compactExpirationBuffer: z.bigint().default(60n),
      mandateExpirationBuffer: z.bigint().default(10n),
      tokens: z.record(
        z.string(),
        z.object({
          address: addressSchema,
          decimals: z.number(),
          symbol: z.string(),
          coingeckoId: z.string(),
        }),
      ),
    }),
  ),
  allocators: z.record(
    z.string(),
    z.object({
      id: z.string(),
      signingAddress: addressSchema,
      url: z.string().url(),
    }),
  ),
});

export type CompactXMetadata = z.input<typeof CompactXMetadataSchema>;

export type CompactXParsedArgs = ParsedArgs & {
  context: BroadcastRequest;
};
