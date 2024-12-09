export type EcoMetadata = {
  protocolName: string;
  intentSource: {
    address: string;
    chainId: number;
    chainName?: string;
  };
  adapters: Array<{
    address: string;
    chainId: number;
    chainName?: string;
  }>;
};

export type IntentData = { adapter: EcoMetadata["adapters"][number] };
