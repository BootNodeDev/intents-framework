#!/usr/bin/env node

import * as solvers from "./solvers/index.js";

const main = () => {
  // TODO: implement a way to choose different listeners and fillers
  const listener = solvers["onChain"].listener.create();
  const filler = solvers["onChain"].filler.create();

  listener(filler);
};

main();