import { confirm, select } from "@inquirer/prompts";
import fs from "fs/promises";
import path from "path";
import { 
  PATHS,
  getExistingSolvers,
  getSolverConfig,
  updateSolverConfig,
  updateSolversIndex,
  cleanupTypechainFiles,
} from "./utils.js";

async function removeSolver() {
  const existingSolvers = await getExistingSolvers();

  if (existingSolvers.length === 0) {
    console.log("No solvers found to remove.");
    return;
  }

  while (true) {
    const choices = [
      ...existingSolvers.map(solver => ({
        name: solver,
        value: solver,
        description: `Remove solver "${solver}" and all related files`
      })),
      {
        name: "Cancel",
        value: "CANCEL",
        description: "Exit without removing any solver"
      }
    ];

    const name = await select({
      message: "Select solver to remove:",
      choices,
      pageSize: Math.min(choices.length, 10)
    });

    if (name === "CANCEL") {
      console.log("Operation cancelled.");
      return;
    }

    const shouldProceed = await confirm({
      message: `Are you sure you want to remove solver "${name}"?`,
      default: false
    });

    if (!shouldProceed) {
      continue;
    }

    try {
      // Remove solver directory
      await fs.rm(path.join(PATHS.solversDir, name), { recursive: true });
      console.log(`✓ Removed solver directory: ${path.join(PATHS.solversDir, name)}`);

      // Update main solvers index.ts
      await updateSolversIndex(name, true);
      console.log(`✓ Removed export from solvers/index.ts`);

      // Update solvers config
      const config = await getSolverConfig();
      delete config[name];
      await updateSolverConfig(config);
      console.log(`✓ Removed configuration from config/solvers.json`);

      // Clean up typechain files
      await cleanupTypechainFiles(name);
      console.log(`✓ Cleaned up typechain generated files`);

      console.log(`\n✅ Solver "${name}" has been successfully removed!`);
      return;
    } catch (error) {
      console.error(`Failed to remove solver: ${error}`);
      return;
    }
  }
}

removeSolver().catch(console.error);
