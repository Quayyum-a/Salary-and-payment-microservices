
import axios from 'axios';
import { paystackAuthHeader } from '../utils/paystack';

/**
 * PaymentsService - wrapper around Paystack Transaction API (initialize & verify)
 * - Uses axios; headers are generated from env PAYSTACK_SECRET_KEY
 *
 * Note: amount is passed through as provided in tests (no automatic kobo conversion).
 */
export class PaymentsService {
  private readonly baseUrl = 'https://api.paystack.co';

  constructor() {}

  /**
   * Initialize a Paystack transaction
   * @param email payer email
   * @param amount amount (as number)
   */
  public async initializeTransaction(email: string, amount: number): Promise<any> {
    const url = `${this.baseUrl}/transaction/initialize`;
    const body = { email, amount };
    const headers = paystackAuthHeader();

    const resp = await axios.post(url, body, { headers });
    if (!resp || !resp.data) throw new Error('No response from Paystack');
    if (!resp.data.status) throw new Error(resp.data.message || 'Paystack initialization failed');
    return resp.data.data;
  }

  /**
   * Verify a Paystack transaction by reference
   * @param reference transaction reference
   */
  public async verifyTransaction(reference: string): Promise<any> {
    const url = `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`;
    const headers = paystackAuthHeader();

    const resp = await axios.get(url, { headers });
