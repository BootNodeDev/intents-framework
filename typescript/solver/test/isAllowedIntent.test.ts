import { describe, expect, it } from "@jest/globals";
import { isAllowedIntent } from "../config";
import type { AllowBlockLists } from "../config/types";

describe("block list", () => {
  it("intent not allowed by destination", () => {
    const allowBlockLists: AllowBlockLists = {
      allowList: [],
      blockList: [
        {
          senderAddress: "*",
          destinationDomain: ["1"],
          recipientAddress: "*",
        },
      ],
    };
    expect(
      isAllowedIntent(allowBlockLists, {
        senderAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
        destinationDomain: "1",
        recipientAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
      }),
    ).toBeFalsy();
  });

  it("intent not allowed by sender", () => {
    const allowBlockLists: AllowBlockLists = {
      allowList: [],
      blockList: [
        {
          senderAddress: ["0xca7f632e91B592178D83A70B404f398c0a51581F"],
          destinationDomain: "*",
          recipientAddress: "*",
        },
      ],
    };
    expect(
      isAllowedIntent(allowBlockLists, {
        senderAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
        destinationDomain: "1",
        recipientAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
      }),
    ).toBeFalsy();
  });

  it("intent not allowed by recipientAddress", () => {
    const allowBlockLists: AllowBlockLists = {
      allowList: [],
      blockList: [
        {
          senderAddress: "*",
          destinationDomain: "*",
          recipientAddress: ["0xca7f632e91B592178D83A70B404f398c0a51581F"],
        },
      ],
    };
    expect(
      isAllowedIntent(allowBlockLists, {
        senderAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
        destinationDomain: "1",
        recipientAddress: "0xca7f632e91B592178D83A70B404f398c0a51581F",
      }),
    ).toBeFalsy();
  });
});
