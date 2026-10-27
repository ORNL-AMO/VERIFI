/** Runtime hashing is kept outside deterministic report projection and native IDB transactions. */
export async function analysisReviewFingerprint(content: string): Promise<string> {
  if (!globalThis.crypto?.subtle) throw new Error('Analysis review could not be verified. Open VERIFI in a secure browser context and try again.');
  const bytes = new TextEncoder().encode(content);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
