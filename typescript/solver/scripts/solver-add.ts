import { input } from "@inquirer/prompts";
import { existsSync } from "fs";
import fs from "fs/promises";
import path from "path";
import { allowBlockListsTemplate } from "./templates/config/allowBlockLists.js";
import { configIndexTemplate } from "./templates/config/index.js";
import { metadataTemplate } from "./templates/config/metadata.js";
import { fillerTemplate } from "./templates/filler.js";
import { listenerTemplate } from "./templates/listener.js";
import { rulesIndexTemplate } from "./templates/rules/index.js";
import { typesTemplate } from "./templates/types.js";
import {
  PATHS,
  getSolverConfig,
  updateSolverConfig,
  updateSolversIndex,
  validateSolverName,
} from "./utils.js";

async function getSolverName(cliName?: string): Promise<string> {
  // If name provided via CLI
  if (cliName) {
    if (!validateSolverName(cliName)) {
      throw new Error(
        "Name must start with a letter and contain only alphanumeric characters.",
      );
    }

    const solverPath = path.join(PATHS.solversDir, cliName);
    if (existsSync(solverPath)) {
      throw new Error(`Solver "${cliName}" already exists. Please choose a different name.`);
    }

    return cliName;
  }

  // Interactive mode
  let name;
  while (true) {
    name = await input({
      message: 'Enter the solver name (e.g., "myProtocol"):',
    });

    if (!validateSolverName(name)) {
      console.log(
        "Name must start with a letter and contain only alphanumeric characters. Please try again.",
      );
      continue;
    }

    const solverPath = path.join(PATHS.solversDir, name);
    if (existsSync(solverPath)) {
      console.log(
        `\nSolver "${name}" already exists. Please choose a different name.`,
      );
      continue;
    }

    break;
  }

  return name;
}

async function generateSolver(cliName?: string) {
  try {
    const name = await getSolverName(cliName);
    const className = name.charAt(0).toUpperCase() + name.slice(1);
    const contractAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const chainName = "basesepolia";
    const basePath = path.join(PATHS.solversDir, name);

    // Create directory structure
    const dirs = [
      basePath,
      path.join(basePath, "config"),
      path.join(basePath, "contracts"),
      path.join(basePath, "rules"),
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Create files
    const files = {
      "index.ts": `export { create as createListener } from './listener.js';
export { create as createFiller } from './filler.js';
export * from './config/index.js';
export * from './rules/index.js';`,
      "types.ts": typesTemplate(name, className),
      "listener.ts": listenerTemplate(name, className),
      "filler.ts": fillerTemplate(name, className),
      "config/index.ts": configIndexTemplate(),
      "config/metadata.ts": metadataTemplate(name, contractAddress, chainName),
      "config/allowBlockLists.ts": allowBlockListsTemplate(),
      "rules/index.ts": rulesIndexTemplate(),
    };

    for (const [filename, content] of Object.entries(files)) {
      await fs.writeFile(path.join(basePath, filename), content);
    }

    await updateSolversIndex(name);

    const config = await getSolverConfig();

    if (name in config) {
      console.log(`Solver "${name}" already exists in config/solvers.json`);
    } else {
      const enableSolver = await input({
        message: "Enable solver? (true/false):",
        default: "true",
        validate: (value) => {
          if (!["true", "false"].includes(value.toLowerCase())) {
            return "Please enter either 'true' or 'false'";
          }
          return true;
        },
      });

      config[name] = {
        enabled: enableSolver.toLowerCase() === "true",
        options: {},
      };

      await updateSolverConfig(config);
    }

    console.log(`
✅ Solver "${name}" has been created successfully!

Next steps:
1. Add your contract ABI to: solvers/${name}/contracts/
2. Run 'yarn contracts:typegen' to generate TypeScript types
3. Update the listener and filler implementations
4. Configure your solver options in: config/solvers.ts
5. Update metadata configuration in: solvers/${name}/config/metadata.ts
   - Replace the default contract address (${contractAddress})
   - Set the appropriate chain name (currently set to ${chainName})
   - Add any additional metadata fields specific to your solver

For more details, check the documentation in the README.md
`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Get the solver name from command line arguments
const cliName = process.argv[2];
generateSolver(cliName).catch(console.error);
