import { checkbox, confirm } from "@inquirer/prompts";
import fs from "fs/promises";
import path from "path";
import {
  PATHS,
  cleanupTypechainFiles,
  getExistingSolvers,
  getSolverConfig,
  updateSolverConfig,
  updateSolversIndex,
} from "./utils.js";

function cancelOp() {
  console.log('\nOperation cancelled.');
  process.exit(0);
}

async function removeSolver() {
  process.stdin.on('keypress', (_, key) => {
    if (key.name === 'q') {
      cancelOp();
    }
  });

  const existingSolvers = await getExistingSolvers();

  if (existingSolvers.length === 0) {
    console.log("No solvers found to remove.");
    return;
  }

  while (true) {
    const choices = existingSolvers.map(solver => ({
      name: solver,
      value: solver,
      description: `Remove solver "${solver}" and all related files`
    }));

    try {
      const selectedSolvers = await checkbox({
        message: "Select solvers to remove (space to select, enter to confirm, q to quit):",
        choices,
        pageSize: Math.min(choices.length, 10),
        loop: true,
      });

      if (selectedSolvers.length === 0) {
        continue;
      }

      const solverList = selectedSolvers.join(", ");
      const shouldProceed = await confirm({
        message: `Are you sure you want to remove the following solvers: ${solverList}?`,
        default: false
      });

      if (!shouldProceed) {
        continue;
      }

      try {
        for (const name of selectedSolvers) {
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
        }
        return;
      } catch (error) {
        console.error(`Failed to remove solvers: ${error}`);
        return;
      }
    } catch (error) {
      if (error.message?.includes('User force closed')) {
        cancelOp();
      }

      throw error;
    }
  }
}

removeSolver().catch(console.error);
