import { createLogger } from "../../logger.js";
import { metadata } from "./config/index.js";

export const log = createLogger(metadata.protocolName);
