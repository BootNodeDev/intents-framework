import type { Logger } from "../../../../logger.js";
import { log } from "../../utils.js";

// Map chain IDs to CoinGecko platform IDs and their native token IDs
const CHAIN_TO_PLATFORM: Record<
  number,
  { platform: string; nativeToken: string }
> = {
  1: { platform: "ethereum", nativeToken: "ethereum" },
  10: { platform: "optimistic-ethereum", nativeToken: "ethereum" },
  130: { platform: "unichain", nativeToken: "ethereum" },
  8453: { platform: "base", nativeToken: "ethereum" },
};

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
}

class CoinGeckoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CoinGeckoError";
  }
}

export class CoinGeckoProvider {
  private cache: Map<number, { data: PriceData; timestamp: number }>;
  private log: Logger;
  private baseUrl: string;
  private headers: Record<string, string>;
  private readonly CACHE_TTL = 120_000;

  constructor(apiKey?: string) {
    this.cache = new Map();
    this.log = log;
    this.baseUrl = apiKey
      ? "https://pro-api.coingecko.com/api/v3"
      : "https://api.coingecko.com/api/v3";
    this.headers = {
      accept: "application/json",
      ...(apiKey && { "x-cg-pro-api-key": apiKey }),
    };
  }

  private async makeRequest<T>(url: string, errorContext: string): Promise<T> {
    try {
      // Use global fetch
      const response = await fetch(url, { headers: this.headers });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = (await response.json()) as { error?: string };
          errorMessage = errorData?.error || response.statusText;
        } catch {
          errorMessage = response.statusText;
        }
        throw new CoinGeckoError(`${errorContext}: ${errorMessage}`);
      }

      const data = await response.json();
      if (!data) {
        throw new CoinGeckoError(`${errorContext}: Empty response`);
      }

      return data as T;
    } catch (error) {
      if (error instanceof CoinGeckoError) throw error;
      throw new CoinGeckoError(
        `${errorContext}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  private validateEthPriceResponse(
    data: unknown,
    nativeToken: string,
  ): asserts data is { [key: string]: { usd: number } } {
    if (!data || typeof data !== "object") {
      throw new CoinGeckoError(
        "Invalid native token price response format: not an object",
      );
    }

    const priceObj = data as { [key: string]: { usd?: unknown } };
    if (
      !priceObj[nativeToken]?.usd ||
      typeof priceObj[nativeToken].usd !== "number"
    ) {
      throw new CoinGeckoError(
        "Invalid native token price response format: missing or invalid price",
      );
    }
  }

  private getPlatformInfo(chainId: number): {
    platform: string;
    nativeToken: string;
  } {
    const info = CHAIN_TO_PLATFORM[chainId];
    if (!info) {
      throw new CoinGeckoError(`Unsupported chain ID: ${chainId}`);
    }
    return info;
  }

  async getEthPrice(chainId: number): Promise<PriceData> {
    const cached = this.cache.get(chainId);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }

    try {
      const { nativeToken } = this.getPlatformInfo(chainId);
      const url = `${this.baseUrl}/simple/price?ids=${nativeToken}&vs_currencies=usd`;

      this.log.debug({
        name: "CoinGeckoProvider",
        msg: "Fetching native token price",
        chainId,
        url,
      });

      const data = await this.makeRequest<unknown>(
        url,
        "Failed to fetch ETH price",
      );
      this.validateEthPriceResponse(data, nativeToken);

      this.log.debug({
        name: "CoinGeckoProvider",
        msg: "Received native token price data",
        data: JSON.stringify(data),
      });

      const timestamp = Date.now();
      const priceData: PriceData = {
        price: data[nativeToken].usd,
        timestamp,
        source: "coingecko",
      };

      this.cache.set(chainId, { data: priceData, timestamp });
      return priceData;
    } catch (error) {
      this.log.error({
        name: "CoinGeckoProvider",
        msg: "Failed to fetch ETH price",
        error,
      });
      throw error;
    }
  }
}
