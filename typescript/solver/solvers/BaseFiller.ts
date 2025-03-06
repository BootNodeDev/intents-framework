import type { MultiProvider } from "@hyperlane-xyz/sdk";
import type { Result } from "@hyperlane-xyz/utils";
import {
  type GenericAllowBlockLists,
  isAllowedIntent,
} from "../config/index.js";
import type { Logger } from "../logger.js";
import type { BaseMetadata, BuildRules } from "./types.js";

export type ParsedArgs = {
  orderId: string;
  senderAddress: string;
  recipients: Array<{
    destinationChainName: string;
    recipientAddress: string;
  }>;
};

export type BaseRule<
  TMetadata extends BaseMetadata,
  TParsedArgs extends ParsedArgs,
  TIntentData extends unknown,
> = (
  parsedArgs: TParsedArgs,
  context: BaseFiller<TMetadata, TParsedArgs, TIntentData>,
) => Promise<Result<string>>;

export abstract class BaseFiller<
  TMetadata extends BaseMetadata,
  TParsedArgs extends ParsedArgs,
  TIntentData extends unknown,
> {
  rules: Array<BaseRule<TMetadata, TParsedArgs, TIntentData>> = [];

  protected constructor(
    readonly multiProvider: MultiProvider,
    readonly allowBlockLists: GenericAllowBlockLists,
    readonly metadata: TMetadata,
    readonly log: Logger,
    rulesConfig?: BuildRules<BaseRule<TMetadata, TParsedArgs, TIntentData>>,
  ) {
    if (rulesConfig) this.rules = this.buildRules(rulesConfig);
  }

  create() {
    return async (
      parsedArgs: TParsedArgs,
      originChainName: string,
      blockNumber: number,
    ) => {
      try {
        const origin = await this.retrieveOriginInfo(
          parsedArgs,
          originChainName,
        );
        const target = await this.retrieveTargetInfo(parsedArgs);

        this.log.info({
          msg: "Intent Indexed",
          intent: `${this.metadata.protocolName}-${parsedArgs.orderId}`,
          origin: origin.join(", "),
          target: target.join(", "),
        });
      } catch (error) {
        this.log.error({
          msg: "Failed retrieving origin and target info",
          intent: `${this.metadata.protocolName}-${parsedArgs.orderId}`,
          error: JSON.stringify(error),
        });
      }

      const intent = await this.prepareIntent(parsedArgs);

      if (!intent.success) {
        this.log.error(`Failed evaluating filling Intent: ${intent.error}`);
        return;
      }

      const { data } = intent;

      try {
        await this.fill(parsedArgs, data, originChainName, blockNumber);

        await this.settleOrder(parsedArgs, data, originChainName);
      } catch (error) {
        this.log.error({
          msg: `Failed processing intent`,
          intent: `${this.metadata.protocolName}-${parsedArgs.orderId}`,
          error: JSON.stringify(error),
        });
      }
    };
  }

  protected abstract retrieveOriginInfo(
    parsedArgs: TParsedArgs,
    chainName: string,
  ): Promise<Array<string>>;

  protected abstract retrieveTargetInfo(
    parsedArgs: TParsedArgs,
  ): Promise<Array<string>>;

  protected async prepareIntent(
    parsedArgs: TParsedArgs,
  ): Promise<Result<TIntentData>> {
    this.log.info({
      msg: "Evaluating filling Intent",
      intent: `${this.metadata.protocolName}-${parsedArgs.orderId}`,
    });

    const { senderAddress, recipients } = parsedArgs;

    if (!this.isAllowedIntent({ senderAddress, recipients })) {
      throw new Error("Not allowed intent");
    }

    const result = await this.evaluateRules(parsedArgs);

    if (!result.success) {
      throw new Error(result.error);
    }

    return { error: "Not implemented", success: false };
  }

  protected async evaluateRules(parsedArgs: TParsedArgs) {
    let result: Result<string> = { success: true, data: "No rules" };

    for (const rule of this.rules) {
      result = await rule(parsedArgs, this);

      if (!result.success) {
        break;
      }
    }

    return result;
  }

  protected abstract fill(
    parsedArgs: TParsedArgs,
    data: TIntentData,
    originChainName: string,
    blockNumber: number,
  ): Promise<void>;

  protected async settleOrder(
    parsedArgs: TParsedArgs,
    data: TIntentData,
    originChainName: string,
  ) {
    return;
  }

  protected isAllowedIntent({
    senderAddress,
    recipients,
  }: {
    senderAddress: string;
    recipients: Array<{
      destinationChainName: string;
      recipientAddress: string;
    }>;
  }) {
    return recipients.every(({ destinationChainName, recipientAddress }) =>
      isAllowedIntent(this.allowBlockLists, {
        senderAddress,
        destinationDomain: destinationChainName,
        recipientAddress,
      }),
    );
  }

  private buildRules({
    base = [],
    custom,
  }: BuildRules<BaseRule<TMetadata, TParsedArgs, TIntentData>>): Array<
    BaseRule<TMetadata, TParsedArgs, TIntentData>
  > {
    const customRules = [];

    if (this.metadata.customRules?.rules.length) {
      if (!custom) {
        throw new Error(
          "Custom rules are specified in metadata, but no corresponding rule functions were provided.",
        );
      }

      for (let i = 0; i < this.metadata.customRules.rules.length; i++) {
        const rule = this.metadata.customRules.rules[i];
        const ruleFn = custom[rule.name];

        if (!ruleFn) {
          throw new Error(
            `Custom rule "${rule.name}" is specified in metadata but is not provided in the custom rules configuration.`,
          );
        }

        customRules.push(ruleFn(rule.args));
      }
    }

    const keepBaseRules = this.metadata.customRules?.keepBaseRules ?? true;

    return keepBaseRules ? [...base, ...customRules] : customRules;
  }
}
