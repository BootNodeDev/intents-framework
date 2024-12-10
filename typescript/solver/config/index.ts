import z from "zod";
import dotenvFlow from "dotenv-flow";
import allowBlockListsGlobal from "./allowBlockLists.js";
import { ConfigSchema } from "./types.js";
import { chainMetadata } from "@hyperlane-xyz/registry";

dotenvFlow.config();

const LOG_FORMAT = process.env.LOG_FORMAT;
const LOG_LEVEL = process.env.LOG_LEVEL;
const MNEMONIC = process.env.MNEMONIC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

export { LOG_FORMAT, LOG_LEVEL, MNEMONIC, PRIVATE_KEY };

type GenericAllowBlockListItem = z.infer<typeof ConfigSchema>;

type GenericAllowBlockLists = {
  allowList: GenericAllowBlockListItem[];
  blockList: GenericAllowBlockListItem[];
};

type Item = {
  [Key in keyof GenericAllowBlockListItem]: string;
};

const matches = (item: GenericAllowBlockListItem, data: Item): boolean => {
  return Object.entries(item)
    .filter(([, value]) => value !== "*")
    .every(([key, value]) => {
      if (Array.isArray(value)) {
        value = value.map((value) => value.toLowerCase());
      } else {
        value = value.toLowerCase();
      }

      return value.includes(data[key].toLowerCase());
    });
};

export function isAllowedIntent(
  allowBlockLists: GenericAllowBlockLists,
  transaction: Item,
): boolean {
  // Check blockList first
  const consolidatedBlockList = [
    ...allowBlockListsGlobal.blockList,
    ...allowBlockLists.blockList,
  ];
  const isBlocked = consolidatedBlockList.some((blockItem) =>
    matches(blockItem, transaction),
  );

  if (isBlocked) return false;

  // Check allowList
  const consolidatedAllowList = [
    ...allowBlockListsGlobal.allowList,
    ...allowBlockLists.allowList,
  ];
  const isAllowed =
    !consolidatedAllowList.length ||
    consolidatedAllowList.some((allowItem) => matches(allowItem, transaction));

  return isAllowed;
}

export const chainNames = Object.keys(chainMetadata)

export const chainIds = Object.entries(chainMetadata).reduce<{[key: string]: number | string}>((acc, [key, value] ) => {
  acc[key] = value.chainId
  return acc
}, {})

export const chainIdsToName = Object.entries(chainMetadata).reduce<{[key: string]: string}>((acc, [key, value] ) => {
  acc[value.chainId.toString()] = key
  return acc
}, {})
