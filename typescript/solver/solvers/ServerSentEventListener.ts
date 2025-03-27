import { EventSource } from 'eventsource';

import type { Logger } from "../logger.js";
import type { ParsedArgs } from "./BaseFiller.js";
import { BaseServerSentEventSource } from "./types.js";

export abstract class ServerSentEventListener<
  TSSEvent extends MessageEvent['data'],
  TParsedArgs extends ParsedArgs
>{
  private sse: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1_000;
  private sseUrl: string;

  protected onOpen(event: Event) {}
  protected onError(error: any) {}

  protected constructor(
    private readonly metadata: {
      sse: BaseServerSentEventSource,
      protocolName: string;
    },
    private readonly log: Logger,
  ) {
    this.sseUrl = this.metadata.sse.url;
    this.maxReconnectAttempts =
      this.metadata.sse.options?.maxReconnectAttempts || this.maxReconnectAttempts;
    this.reconnectDelay =
      this.metadata.sse.options?.reconnectDelay || this.reconnectDelay;
  }

  private connect(): void {
    try {
      this.sse = new EventSource(this.sseUrl, this.metadata.sse.eventSourceInit);
      this.setupEventListeners();
    } catch (error) {
      this.log.error({
        msg: "Failed to create SSE connection",
        error: JSON.stringify(error),
      });
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.sse) return;

    this.sse.onerror = (error) => {
      this.log.error({
        msg: "SSE error occurred",
        error: JSON.stringify(error),
      });
      this.onError?.(error);
    };

    this.sse.onopen = (event) => {
      this.log.info({ msg: "SSE connection established" });
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1_000;
      this.onOpen?.(event);
    };
  }

  private handleReconnect(): void {
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

  create() {
    return (
      handler: (
        args: TParsedArgs,
        originChainName: string,
        blockNumber: number,
      ) => void,
    ) => {
      this.connect();

      if (!this.sse) {
        this.log.debug({ msg: "SSE connection not yet established" });
        return;
      }

      this.sse.onmessage = (event: MessageEvent): void => {
        try {
          if (event.data !== '') {
            const args = this.parseEventArgs(event.data as TSSEvent);
            handler(args, "", -1);
          }
        } catch (error) {
          this.log.error("Error parsing message:", error);
        }
      };

      return () => {
        this.sse?.close();
      };
    };
  }

  protected abstract parseEventArgs(args: TSSEvent): TParsedArgs;
}
