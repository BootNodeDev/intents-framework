import type { Logger } from "../logger.js";
import type { ParsedArgs } from "./BaseFiller.js";

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
      sse: {
        url: string;
      };
      protocolName: string;
    },
    private readonly log: Logger,
  ) {
    this.sseUrl = this.metadata.sse.url;
  }

  private connect(): void {
    try {
      this.sse = new EventSource(this.sseUrl);
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

      this.sse.onmessage = (event: MessageEvent<TSSEvent>): void => {
        try {
          const args = this.parseEventArgs(event.data);
          handler(args, "", -1);
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
