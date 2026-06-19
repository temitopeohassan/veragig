const { recoverMessageAddress, getAddress, keccak256, toHex } = require('viem');
const { getFirestore } = require('../database');

// Signed-message auth: a request must carry a wallet signature over a canonical
// message that binds the action + subject + signer + a timestamp + a random nonce.
// We verify the signature recovers to the claimed address, that it is fresh, and
// that it has not been used before (replay protection).
//
// `subject` is whatever the action is scoped to: a task id for task actions, or
// the wallet address for profile actions.

const SIG_TTL_MS = 5 * 60 * 1000; // 5 minutes
const USED_COLLECTION = 'used_signatures';

/**
 * Build the canonical message to sign. MUST stay byte-for-byte identical to the
 * frontend builder in `frontend/lib/authSign.ts`.
 */
function buildActionMessage({ action, subject, address, issuedAt, nonce }) {
  return [
    'VeraGig authorization request.',
    '',
    `Action: ${action}`,
    `Subject: ${subject}`,
    `Address: ${getAddress(address)}`,
    `Issued At: ${issuedAt}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

/**
 * Verify a signed action and consume the signature so it cannot be replayed.
 * Throws an Error whose message is a stable code (AUTH_*) on failure.
 *
 * @returns {Promise<string>} the checksummed, verified signer address.
 */
async function verifySignedAction({ action, subject, address, issuedAt, nonce, signature }) {
  if (!address || !signature || !issuedAt || !nonce) {
    throw new Error('AUTH_MISSING_FIELDS');
  }

  // Freshness — reject stale or future-dated requests.
  const ts = Date.parse(issuedAt);
  if (Number.isNaN(ts) || Math.abs(Date.now() - ts) > SIG_TTL_MS) {
    throw new Error('AUTH_EXPIRED');
  }

  // Verify the signature recovers to the claimed address (EOA signatures).
  const message = buildActionMessage({ action, subject, address, issuedAt, nonce });
  let recovered;
  try {
    recovered = await recoverMessageAddress({ message, signature });
  } catch (e) {
    throw new Error('AUTH_INVALID_SIGNATURE');
  }
  if (getAddress(recovered) !== getAddress(address)) {
    throw new Error('AUTH_INVALID_SIGNATURE');
  }

  // Replay protection — consume the signature hash exactly once.
  const db = getFirestore();
  const sigId = keccak256(toHex(signature)).slice(2);
  const ref = db.collection(USED_COLLECTION).doc(sigId);
  const existing = await ref.get();
  if (existing.exists) {
    throw new Error('AUTH_REPLAY');
  }
  await ref.set({ action, address: getAddress(address), used_at: new Date() });

  return getAddress(address);
}

module.exports = { verifySignedAction, buildActionMessage };
