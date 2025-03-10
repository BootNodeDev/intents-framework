import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SolverConfigSchema = z.object({
  enabled: z.boolean(),
});

export type SolverConfig = z.infer<typeof SolverConfigSchema>;

// Read and parse the JSON file
const solversConfigPath = path.join(__dirname, "solvers.json");
export const solversConfig: Record<string, SolverConfig> = JSON.parse(
  fs.readFileSync(solversConfigPath, "utf-8"),
);

// Validate config
Object.entries(solversConfig).forEach(([name, config]) => {
  SolverConfigSchema.parse(config);
});

export type SolverName = keyof typeof solversConfig;
