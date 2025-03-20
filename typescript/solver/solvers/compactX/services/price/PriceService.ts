import EventEmitter from "node:events";
import type { Logger } from "../../../../logger.js";
import { metadata } from "../../config/index.js";
import { log } from "../../utils.js";
import { CoinGeckoProvider } from "./CoinGeckoProvider.js";

interface PriceData {
  price: number;
  lastUpdated: number;
}

export class PriceService extends EventEmitter {
  private prices: Map<number, PriceData>;
  private log: Logger;
  private provider: CoinGeckoProvider;
  private updateInterval: NodeJS.Timeout | null;
  private readonly UPDATE_INTERVAL = 60_000;

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
      this.log.error({
        name: "PriceService",
        msg: "Failed to fetch initial prices",
        error,
      });
    });

    // Set up periodic updates
    this.updateInterval = setInterval(() => {
      this.updatePrices().catch((error) => {
        this.log.error({
          name: "PriceService",
          msg: "Failed to update prices",
          error,
        });
      });
    }, this.UPDATE_INTERVAL);
  }

  public stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  public getPrice(chainId: number): number {
    const priceData = this.prices.get(chainId);
    if (!priceData) {
      this.log.error({
        name: "PriceService",
        msg: "No price data available",
        chainId,
      });
      return 0;
    }

    // Check if price is stale
    const stalePriceThreshold = 120_000;
    if (Date.now() - priceData.lastUpdated > stalePriceThreshold) {
      this.log.warn({
        name: "PriceService",
        msg: "Price data is stale",
        chainId,
      });
    }

    return priceData.price;
  }

  private async updatePrices(): Promise<void> {
    for (const chainId in metadata.chainInfo) {
      try {
        const { price } = await this.provider.getEthPrice(chainId);
        this.prices.set(+chainId, {
          price,
          lastUpdated: Date.now(),
        });
        this.log.debug({
          name: "PriceService",
          msg: "Updated ETH price",
          chainId,
          price,
        });

        // Emit the price update
        this.emit("price_update", chainId, price);
      } catch (error) {
        this.log.error({
          name: "PriceService",
          msg: "Failed to update price",
          chainId,
          error,
        });
        // Don't update the price if there's an error, keep using the old one
      }
    }
  }
}
