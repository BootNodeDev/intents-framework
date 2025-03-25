import type { Logger } from "../logger.js";
import type { ParsedArgs } from "./BaseFiller.js";

import { WebSocket } from "ws";
import { WSClientOptions } from "./types.js";

export interface ConnectionUpdate {
  type: "connected";
  data: {
    clientCount: number;
  };
  timestamp: string;
}

export type WebSocketMessage = ConnectionUpdate;

export abstract class WebSocketListener<TParsedArgs extends ParsedArgs> {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1_000;
  private pingInterval: NodeJS.Timeout | null = null;
  private pongTimeout: NodeJS.Timeout | null = null;
  private lastPingTime = 0;
  private wsUrl: string;

  protected onOpen() {}
  protected onClose() {}
  protected onError() {}

  protected constructor(
    private readonly metadata: {
      webSocket: {
        url: string;
        clientOptions?: WSClientOptions;
        options?: {
          maxReconnectAttempts?: number;
          reconnectDelay?: number;
        };
      };
      protocolName: string;
    },
    private readonly log: Logger,
  ) {
    this.maxReconnectAttempts =
      this.metadata.webSocket.options?.maxReconnectAttempts ||
      this.maxReconnectAttempts;
    this.reconnectDelay =
      this.metadata.webSocket.options?.reconnectDelay || this.reconnectDelay;

    this.wsUrl = this.metadata.webSocket.url;
  }

  private connect(): void {
    try {
      this.ws = new WebSocket(
        this.wsUrl,
        this.metadata.webSocket.clientOptions as WebSocket.ClientOptions,
      );
      this.setupEventListeners();
    } catch (error) {
      this.log.error({
        msg: "Failed to create WebSocket connection",
        error: JSON.stringify(error),
      });
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.on("open", (): void => {
      this.log.info({ msg: "WebSocket connection established" });
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.setupPingInterval();
      this.onOpen?.();
    });

    this.ws.on("close", (): void => {
      this.log.info({ msg: "WebSocket connection closed" });
      this.cleanupPingInterval();
      this.onClose?.();
      this.handleReconnect();
    });

    this.ws.on("error", (error: Error): void => {
      this.log.error({
        msg: "WebSocket error occurred",
        error: JSON.stringify(error),
      });
      this.cleanupPingInterval();
    });

    this.ws.on("pong", () => {
      if (this.pongTimeout) {
        clearTimeout(this.pongTimeout);
        this.pongTimeout = null;
      }

      const latency = Date.now() - this.lastPingTime;
      this.log.debug({ msg: "WebSocket pong", latency });
    });
  }

  private handleReconnect(): void {
    this.cleanupPingInterval();
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.log.info({
        msg: `Attempting to reconnect... (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`,
      });

      setTimeout(() => {
        this.reconnectAttempts++;
        this.reconnectDelay *= 2; // Exponential backoff
        this.connect();
      }, this.reconnectDelay);
    } else {
      this.log.error({ msg: "Max reconnection attempts reached" });
    }
  }

  private setupPingInterval(): void {
    // Send a ping every 15 seconds
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();

        this.ws.ping();

        // Set a timeout to close and reconnect if we don't receive a pong within 5 seconds
        this.pongTimeout = setTimeout(() => {
          this.log.warn({
            msg: "No pong received within timeout, closing connection...",
          });
          if (this.ws) {
            this.ws.close();
          }
        }, 5_000);
      }
    }, 15_000);
  }

  private cleanupPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  create() {
    return (
      handler: (
        args: TParsedArgs,
        originChainName: string,
        blockNumber: number,
      ) => void,
    ) => {
      this.connect();

      if (!this.ws) {
        this.log.debug({ msg: "WebSocket connection not yet established" });
        return;
      }

      this.ws.on("message", (data: Buffer): void => {
        try {
          const args = this.parseEventArgs(data);
          handler(args, "", -1);
        } catch (error) {
          this.log.error("Error parsing message:", error);
        }
      });

      return () => {
        this.cleanupPingInterval();
        this.ws?.close();
      };
    };
  }

  protected abstract parseEventArgs(args: Buffer): TParsedArgs;
}
