export type AllowBlockListItem = {
  senderAddress: string[] | "*";
  destinationDomain: string[] | "*";
  recipientAddress: string[] | "*";
};

export type AllowBlockLists = {
  allowList: AllowBlockListItem[];
  blockList: AllowBlockListItem[];
};
