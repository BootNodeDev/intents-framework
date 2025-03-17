import EventEmitter from "node:events";
import type { Logger } from "../../../../logger.js";
import {
  SUPPORTED_CHAINS,
  type SupportedChainId,
} from "../../config/constants.js";
import { log } from "../../utils.js";
import { CoinGeckoProvider } from "./CoinGeckoProvider.js";

interface PriceData {
  price: number;
  lastUpdated: number;
}

export class PriceService extends EventEmitter {
  private prices: Map<SupportedChainId, PriceData>;
  private log: Logger;
  private provider: CoinGeckoProvider;
  private updateInterval: NodeJS.Timeout | null;
  private readonly UPDATE_INTERVAL = 10_000; // 10 seconds

  constructor(apiKey?: string) {
    super();
    this.prices = new Map();
    this.log = log;
    this.provider = new CoinGeckoProvider(apiKey);
    this.updateInterval = null;
  }

  public start(): void {
    // Initial price fetch
    this.updatePrices().catch((error) => {
      this.log.error({ msg: "Failed to fetch initial prices", error });
    });

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.updatePrices().catch((error) => {
        this.log.error({ msg: "Failed to update prices", error });
      });
    }, this.UPDATE_INTERVAL);
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public getPrice(chainId: SupportedChainId): number {
    const priceData = this.prices.get(chainId);
    if (!priceData) {
      throw new Error(`No price data available for chain ${chainId}`);
    }

    // Check if price is stale (older than 30 seconds)
    const stalePriceThreshold = 30_000; // 30 seconds
    if (Date.now() - priceData.lastUpdated > stalePriceThreshold) {
      this.log.warn({ msg: "Price data is stale", chainId });
    }

    return priceData.price;
  }

  private async updatePrices(): Promise<void> {
    for (const chainId of SUPPORTED_CHAINS) {
      try {
        const { price } = await this.provider.getEthPrice(chainId);
        this.prices.set(chainId, {
          price,
          lastUpdated: Date.now(),
        });
        this.log.debug({ msg: "Updated ETH price", chainId, price });

        // Emit the price update
        this.emit("price_update", chainId, price);
      } catch (error) {
        this.log.error({ msg: "Failed to update price", chainId, error });
        // Don't update the price if there's an error, keep using the old one
      }
    }
  }
}
