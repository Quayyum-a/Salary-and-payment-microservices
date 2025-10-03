import axios from 'axios';
import crypto from 'crypto';
import { PaymentsService } from '../src/services/payments';
import { verifyPaystackSignature } from '../src/utils/paystack';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PaymentsService (Paystack)', () => {
  const PAYSTACK_SECRET = 'sk_test_123';
  const PAYSTACK_WEBHOOK_SECRET = 'whsec_test_123';
  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = PAYSTACK_SECRET;
    process.env.PAYSTACK_WEBHOOK_SECRET = PAYSTACK_WEBHOOK_SECRET;
  });

  it('initializes a transaction with Paystack', async () => {
    const service = new PaymentsService();
    const input = { email: 'buyer@example.com', amount: 5000 };

    const fakeResp = {
      data: {
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: 'https://paystack/authorize',
          reference: 'ref_123',
        },
      },
    };

    mockedAxios.post.mockResolvedValueOnce(fakeResp);

    const res = await service.initializeTransaction(input.email, input.amount);
    expect(res).toHaveProperty('authorization_url', 'https://paystack/authorize');
    expect(res).toHaveProperty('reference', 'ref_123');
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  it('verifies a transaction by reference', async () => {
    const service = new PaymentsService();
    const reference = 'ref_abc';

    const fakeResp = {
      data: {
        status: true,
        message: 'Verification successful',
        data: {
          status: 'success',
          reference,
          amount: 5000,
        },
      },
    };

    mockedAxios.get.mockResolvedValueOnce(fakeResp);

    const res = await service.verifyTransaction(reference);
    expect(res).toHaveProperty('status', 'success');
    expect(res).toHaveProperty('reference', reference);
    expect(mockedAxios.get).toHaveBeenCalled();
  });
});

describe('Paystack webhook signature verification util', () => {
  it('verifies a valid signature', () => {
    const secret = 'whsec_local_test';
    const payload = JSON.stringify({ event: 'charge.success', data: { id: 1 } });

    const signature = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    const ok = verifyPaystackSignature(payload, signature, secret);
    expect(ok).toBe(true);
  });

  it('rejects an invalid signature', () => {
    const secret = 'whsec_local_test';
    const payload = JSON.stringify({ event: 'charge.failed', data: { id: 2 } });
    const badSignature = 'bad_signature_here';
    const ok = verifyPaystackSignature(payload, badSignature, secret);
    expect(ok).toBe(false);
  });
});