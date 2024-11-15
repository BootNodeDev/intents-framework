#!/usr/bin/env node

import "./patch-bigint-buffer-warn.js";

import { log } from "./logger.js";
import * as solvers from "./solvers/index.js";
import { getMultiProvider } from "./solvers/utils.js";

log.title("🙍 Intent Solver 📝");

const main = async () => {
  log.subtitle("Starting...", "\n");

  const multiProvider = await getMultiProvider();

  // TODO: implement a way to choose different listeners and fillers
  const ecoListener = solvers["eco"].listener.create();
  const ecoFiller = solvers["eco"].filler.create(multiProvider);

  ecoListener(ecoFiller);

  const hyperlane7683Listener = solvers["hyperlane7683"].listener.create();
  const hyperlane7683Filler =
    solvers["hyperlane7683"].filler.create(multiProvider);

  hyperlane7683Listener(hyperlane7683Filler);
};

main();
