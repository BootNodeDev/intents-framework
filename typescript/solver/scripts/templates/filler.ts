export const fillerTemplate = (name: string, className: string) => `
import type { MultiProvider } from "@hyperlane-xyz/sdk";
import { BaseFiller } from '../BaseFiller.js';
import { metadata, allowBlockLists } from './config/index.js';
import type { ${className}Metadata, IntentData, ParsedArgs } from './types.js';
import { log } from '../../logger.js';
import { Result } from "@hyperlane-xyz/utils";

export class ${className}Filler extends BaseFiller<${className}Metadata, ParsedArgs, IntentData> {
  constructor(multiProvider: MultiProvider) {
    super(multiProvider, allowBlockLists, metadata, log);
  }

  protected async retrieveOriginInfo(
    parsedArgs: ParsedArgs,
    chainName: string
  ): Promise<Array<string>> {
    return [\`Origin chain: \${chainName}, Sender: \${parsedArgs.senderAddress}\`];
  }

  protected async retrieveTargetInfo(
    parsedArgs: ParsedArgs
  ): Promise<Array<string>> {
    return parsedArgs.recipients.map(
      ({ destinationChainName, recipientAddress }) =>
        \`Destination chain: \${destinationChainName}, Recipient: \${recipientAddress}\`
    );
  }

  protected async fill(
    parsedArgs: ParsedArgs,
    data: IntentData,
    originChainName: string,
    blockNumber: number
  ): Promise<void> {
    // TODO: Implement fill logic
    throw new Error('Fill logic not implemented');
  }

  protected async prepareIntent(
    parsedArgs: ParsedArgs
  ): Promise<Result<IntentData>> {
    try {
      await super.prepareIntent(parsedArgs);
      // TODO: Add your intent preparation logic here
      return { success: true, data: {} };
    } catch (error: any) {
      return {
        error: error.message ?? "Failed to prepare ${className} Intent.",
        success: false,
      };
    }
  }

  protected async settle(
    parsedArgs: ParsedArgs,
    data: IntentData,
    originChainName: string,
    blockNumber: number
  ): Promise<void> {
    // TODO: Implement settlement logic if needed
  }
}

export const create = (multiProvider: MultiProvider) => 
  new ${className}Filler(multiProvider).create();
`;
