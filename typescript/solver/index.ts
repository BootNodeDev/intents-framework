#!/usr/bin/env node

import * as fillers from "./fillers";
import * as listeners from "./listeners";

import "./config";

const main = () => {
  // TODO: implement a way to choose different listeners and fillers
  const listener = listeners['onChain'].create();
  const filler = fillers['onChain'].create();

  listener(filler);
}

main();

