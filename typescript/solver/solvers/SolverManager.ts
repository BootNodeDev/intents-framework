import type { MultiProvider } from "@hyperlane-xyz/sdk";
import { Logger } from "pino";
import { solversConfig, type SolverName } from "../config/solvers.js";
import * as solvers from "./index.js";

type SolverModule = {
  listener: {
    create: () => Promise<ListenerFn>;
  };
  filler: {
    create: (
      multiProvider: MultiProvider,
      rules?: any
    ) => FillerFn;
  };
  rules?: any;
};

type ListenerFn = <T>(
  handler: (args: T, originChainName: string, blockNumber: number) => void
) => ShutdownFn;

type ShutdownFn = () => void;

type FillerFn = <T>(
  args: T,
  originChainName: string,
  blockNumber: number
) => Promise<void>;

export class SolverManager {
  private activeListeners: Array<() => void> = [];

  constructor(
    private readonly multiProvider: MultiProvider,
    private readonly log: Logger
  ) {}

  async initializeSolvers() {
    for (const [solverName, config] of Object.entries(solversConfig)) {
      if (!config.enabled) {
        this.log.info(`Solver ${solverName} is disabled, skipping...`);
        continue;
      }

      try {
        await this.initializeSolver(solverName as SolverName);
      } catch (error: any) {
        this.log.error(
          `Failed to initialize solver ${solverName}: ${error.message}`
        );
        throw error;
      }
    }
  }

  private async initializeSolver(name: SolverName) {
    const solver = solvers[name as keyof typeof solvers] as SolverModule;
    if (!solver) {
      throw new Error(`Solver ${name} not found`);
    }

    this.log.info(`Initializing solver: ${name}`);

    const listener = await solver.listener.create();
    const filler = solver.filler.create(this.multiProvider, solver.rules);

    this.activeListeners.push(listener(filler));
  }

  shutdown() {
    this.log.info("Shutting down solvers...");
    // Cleanup logic for active listeners if needed
    this.activeListeners.forEach((stopListener) => stopListener());
    this.activeListeners = [];
  }
}
