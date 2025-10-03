import crypto from 'crypto';

/**
 * Verify Paystack webhook signature (sha512 HMAC).
 * @param payload Raw request body (string)
 * @param signature Value from 'x-paystack-signature' header
 * @param secret Optional secret to use (falls back to env PAYSTACK_WEBHOOK_SECRET)
 * @returns boolean - true if signature matches
 */
export function verifyPaystackSignature(payload: string, signature: string, secret?: string): boolean {
  const key = secret || process.env.PAYSTACK_WEBHOOK_SECRET || '';
  if (!key) return false;
  const computed = crypto.createHmac('sha512', key).update(payload).digest('hex');
  // Use timing-safe comparison
  const sigBuf = Buffer.from(signature || '', 'utf8');
  const compBuf = Buffer.from(computed, 'utf8');
  if (sigBuf.length !== compBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, compBuf);
}

/**
 * Build common Paystack auth header object for axios.
 */
export function paystackAuthHeader(): { Authorization: string } {
  const key = process.env.PAYSTACK_SECRET_KEY || '';
  return { Authorization: `Bearer ${key}` };
}
