import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SolverConfig {
  enabled: boolean;
  options: Record<string, unknown>;
}

export type SolversConfig = Record<string, SolverConfig>;

export const PATHS = {
  solversDir: path.join(__dirname, "..", "solvers"),
  solversConfig: path.join(__dirname, "..", "config", "solvers.json"),
  solversIndex: path.join(__dirname, "..", "solvers", "index.ts"),
  typechain: path.join(__dirname, "..", "typechain"),
} as const;

export async function getSolverConfig(): Promise<SolversConfig> {
  const configContent = await fs.readFile(PATHS.solversConfig, "utf-8");
  try {
    return JSON.parse(configContent);
  } catch (error) {
    throw new Error(`Failed to parse solvers.json: ${error}`);
  }
}

export async function updateSolverConfig(config: SolversConfig): Promise<void> {
  await fs.writeFile(
    PATHS.solversConfig,
    JSON.stringify(config, null, 2) + "\n",
  );
}

export async function updateSolversIndex(
  name: string,
  remove = false,
): Promise<void> {
  const indexContent = await fs.readFile(PATHS.solversIndex, "utf-8");
  const exportLine = `export * as ${name} from './${name}/index.js';\n`;

  const newContent = remove
    ? indexContent.replace(exportLine, "")
    : indexContent.includes(exportLine)
      ? indexContent
      : indexContent + exportLine;

  await fs.writeFile(PATHS.solversIndex, newContent);
}

export async function getExistingSolvers(): Promise<string[]> {
  return (await fs.readdir(PATHS.solversDir)).filter(
    (name) =>
      existsSync(path.join(PATHS.solversDir, name)) &&
      !name.includes(".") && // Exclude files like index.ts
      name !== "contracts" && // Exclude special directories
      name !== "BaseFiller" &&
      name !== "BaseListener",
  );
}

export function validateSolverName(name: string): boolean {
  return /^[a-zA-Z][a-zA-Z0-9]*$/.test(name);
}

export async function cleanupTypechainFiles(name: string): Promise<void> {
  if (existsSync(PATHS.typechain)) {
    const files = await fs.readdir(PATHS.typechain);
    const solverTypeFiles = files.filter((file) =>
      file.toLowerCase().startsWith(name.toLowerCase()),
    );

    for (const file of solverTypeFiles) {
      await fs.unlink(path.join(PATHS.typechain, file));
    }
  }
}
