export const listenerTemplate = (name: string, className: string) => `
import { BaseListener } from '../BaseListener.js';
import { metadata } from './config/index.js';
import type { ParsedArgs } from './types.js';
import { log } from '../../logger.js';

export class ${className}Listener extends BaseListener<any, any, ParsedArgs> {
  constructor() {
    super(
      // TODO: Replace null with the appropriate contract factory (e.g., ${className}__factory)
      // You'll need to:
      // 1. Add your contract ABI to: solvers/${name}/contracts/
      // 2. Run 'yarn contracts:typegen' to generate the factory
      // 3. Import and use the generated factory here
      null,
      'YourEvent',
      { contracts: [...metadata.intentSources], protocolName: metadata.protocolName },
      log
    );
  }

  protected parseEventArgs(args: any): ParsedArgs {
    // Transform event args into ParsedArgs format
    return {
      orderId: args.id,
      senderAddress: args.sender,
      recipients: [{
        destinationChainName: 'optimismsepolia',
        recipientAddress: args.recipient
      }]
    };
  }
}

export const create = () => new ${className}Listener().create();
`;
