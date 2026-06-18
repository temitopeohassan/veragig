import { getAddress } from "viem";

// Signed-message auth payload sent alongside relayer requests.
export interface AuthPayload {
  signature: string;
  issued_at: string;
  nonce: string;
}

export type AuthAction = "create-task" | "approve-task" | "cancel-task";

/**
 * Build the canonical message to sign. MUST stay byte-for-byte identical to the
 * backend builder in `node-backend/app/services/auth_service.js`.
 */
export function buildActionMessage(params: {
  action: AuthAction;
  taskId: string;
  address: string;
  issuedAt: string;
  nonce: string;
}): string {
  return [
    "VeraGig authorization request.",
    "",
    `Action: ${params.action}`,
    `Task: ${params.taskId}`,
    `Address: ${getAddress(params.address)}`,
    `Issued At: ${params.issuedAt}`,
    `Nonce: ${params.nonce}`,
  ].join("\n");
}

/**
 * Sign an action with the user's wallet and return the auth payload to attach
 * to the request body.
 *
 * @param signMessageAsync wagmi's signMessageAsync ({ message }) => signature
 */
export async function createAuthPayload(
  signMessageAsync: (args: { message: string }) => Promise<string>,
  params: { action: AuthAction; taskId: string; address: string }
): Promise<AuthPayload> {
  const issuedAt = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const message = buildActionMessage({ ...params, issuedAt, nonce });
  const signature = await signMessageAsync({ message });
  return { signature, issued_at: issuedAt, nonce };
}
