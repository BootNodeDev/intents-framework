import type { CompactXRule } from "../filler.js";
import { TheCompactService } from "../services/TheCompactService.js";
import { deriveClaimHash, log } from "../utils.js";
import { verifyBroadcastRequest } from "../validation/signature.js";

export function verifySignatures(): CompactXRule {
  return async (parsedArgs, context) => {
    const theCompactService = new TheCompactService(context.multiProvider, log);

    // Derive and log claim hash
    const claimHash = deriveClaimHash(parsedArgs.context.compact);

    // Set the claim hash before verification
    parsedArgs.context.claimHash = claimHash;

    const { isValid, error } = await verifyBroadcastRequest(
      parsedArgs.context,
      theCompactService,
    );

    if (!isValid) {
      return { error: error ?? "Could not verify signatures", success: false };
    }

    return { data: "Signatures are Ok", success: true };
  };
}
