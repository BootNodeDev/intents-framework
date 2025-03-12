import { isValidAddress } from "@hyperlane-xyz/utils";
import z from "zod";

import { chainNames } from "../config/index.js";

export const addressSchema = z
  .string()
  .refine((address) => isValidAddress(address), {
    message: "Invalid address",
  });

const WSClientOptionsSchema = z.object({
  ALPNCallback: z.function().optional(),
  allowPartialTrustChain: z.boolean().optional(),
  ca: z
    .union([
      z.string(),
      z.instanceof(Buffer),
      z.array(z.union([z.string(), z.instanceof(Buffer)])),
    ])
    .optional(),
  cert: z
    .union([
      z.string(),
      z.instanceof(Buffer),
      z.array(z.union([z.string(), z.instanceof(Buffer)])),
    ])
    .optional(),
  sigalgs: z.string().optional(),
  ciphers: z.string().optional(),
  clientCertEngine: z.string().optional(),
  crl: z
    .union([
      z.string(),
      z.instanceof(Buffer),
      z.array(z.union([z.string(), z.instanceof(Buffer)])),
    ])
    .optional(),
  dhparam: z.union([z.string(), z.instanceof(Buffer)]).optional(),
  ecdhCurve: z.string().optional(),
  honorCipherOrder: z.boolean().optional(),
  key: z
    .union([
      z.string(),
      z.instanceof(Buffer),
      z.array(z.union([z.string(), z.instanceof(Buffer)])),
    ])
    .optional(),
  privateKeyEngine: z.string().optional(),
  privateKeyIdentifier: z.string().optional(),
  maxVersion: z.enum(["TLSv1.3", "TLSv1.2", "TLSv1.1", "TLSv1"]).optional(),
  minVersion: z.enum(["TLSv1.3", "TLSv1.2", "TLSv1.1", "TLSv1"]).optional(),
  passphrase: z.string().optional(),
  pfx: z
    .union([
      z.string(),
      z.instanceof(Buffer),
      z.array(z.union([z.string(), z.instanceof(Buffer)])),
    ])
    .optional(),
  secureOptions: z.number().optional(),
  secureProtocol: z.string().optional(),
  sessionIdContext: z.string().optional(),
  ticketKeys: z.instanceof(Buffer).optional(),
  sessionTimeout: z.number().optional(),
  protocol: z.string().optional(),
  followRedirects: z.boolean().optional(),
  generateMask: z.function().optional(),
  handshakeTimeout: z.number().optional(),
  maxRedirects: z.number().optional(),
  perMessageDeflate: z
    .union([z.boolean(), z.object({}).passthrough()])
    .optional(),
  localAddress: z.string().optional(),
  protocolVersion: z.number().optional(),
  headers: z.record(z.string()).optional(),
  origin: z.string().optional(),
  agent: z.any().optional(),
  host: z.string().optional(),
  family: z.number().optional(),
  checkServerIdentity: z.function().optional(),
  rejectUnauthorized: z.boolean().optional(),
  allowSynchronousEvents: z.boolean().optional(),
  autoPong: z.boolean().optional(),
  maxPayload: z.number().optional(),
  skipUTF8Validation: z.boolean().optional(),
  createConnection: z.function().optional(),
  finishRequest: z.function().optional(),
});

export type WSClientOptions = z.infer<typeof WSClientOptionsSchema>;

export const BaseWebSocketSourceSchema = z.object({
  url: z.string().url({ message: "Invalid WebSocket URL" }),
  clientOptions: WSClientOptionsSchema.optional(),
  options: z
    .object({
      maxReconnectAttempts: z.number().optional(),
      reconnectDelay: z.number().optional(),
    })
    .optional(),
});

export type BaseWebSocketSource = z.infer<typeof BaseWebSocketSourceSchema>;

export const BaseBlockchainEventSourceSchema = z.object({
  address: addressSchema,
  chainName: z.string().refine((name) => chainNames.includes(name), {
    message: "Invalid chainName",
  }),
  pollInterval: z.number().optional(),
  confirmationBlocks: z.number().optional(),
  initialBlock: z.number().optional(),
  processedIds: z.array(z.string()).optional(),
});

export type BaseBlockchainEventSource = z.infer<
  typeof BaseBlockchainEventSourceSchema
>;

export const BaseMetadataSchema = z.object({
  protocolName: z.string(),
  intentSources: z.object({
    blockchainEvents: z.array(BaseBlockchainEventSourceSchema).optional(),
    webSockets: z.array(BaseWebSocketSourceSchema).optional(),
  }),
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
