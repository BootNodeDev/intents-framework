import type { CompactXRule } from "../filler.js";
import { TheCompactService } from "../services/TheCompactService.js";
import { BroadcastRequestSchema } from "../types.js";
import { deriveClaimHash, log } from "../utils.js";
import { verifyBroadcastRequest } from "../validation/signature.js";

export function verifySignatures(): CompactXRule {
  return async (parsedArgs, context) => {
    const { data: request, error: requestError } =
      BroadcastRequestSchema.safeParse(parsedArgs.context);

    if (requestError) {
      return { error: requestError.message, success: false };
    }

    const theCompactService = new TheCompactService(context.multiProvider, log);

    // Derive and log claim hash
    const claimHash = deriveClaimHash(request.compact);

    // Set the claim hash before verification
    request.claimHash = claimHash;

    const { isValid, error } = await verifyBroadcastRequest(
      request,
      theCompactService,
    );

    if (!isValid) {
      return { error: error ?? "Could not verify signatures", success: false };
    }

    return { data: "Signatures are Ok", success: true };
  };
}
