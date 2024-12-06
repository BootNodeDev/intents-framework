import dotenvFlow from "dotenv-flow";
import allowBlockListsGlobal from "./allowBlockLists.js";

dotenvFlow.config();

const LOG_FORMAT = process.env.LOG_FORMAT;
const LOG_LEVEL = process.env.LOG_LEVEL;
const MNEMONIC = process.env.MNEMONIC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

export { LOG_FORMAT, LOG_LEVEL, MNEMONIC, PRIVATE_KEY };

type GenericAllowBlockListItem = {
  [key: string]: string[] | "*";
};

type GenericAllowBlockLists = {
  allowList: GenericAllowBlockListItem[];
  blockList: GenericAllowBlockListItem[];
};

type Item = {
  [Key in keyof GenericAllowBlockListItem]: string;
};

const matches = (item: GenericAllowBlockListItem, data: Item): boolean =>
  Object.entries(item).every(
    ([key, value]) => value === "*" || value.includes(data[key]),
  );

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
