import request from 'supertest';
import crypto from 'crypto';
import app from '../../src/index';
import { default as SalaryPaymentRepository, SalaryPaymentRecord } from '../../src/models/salaryPayment';

describe('Paystack webhook reconciliation', () => {
  const secret = 'whsec_test_webhook';
  beforeAll(() => {
    process.env.PAYSTACK_WEBHOOK_SECRET = secret;
  });

  it('updates a salary payment record on transfer.success webhook', async () => {
    const repo = new SalaryPaymentRepository();
    // create a pending record that the webhook will reconcile
    const created = await repo.create({
      employee_id: '00000000-0000-0000-0000-000000000001',
      transfer_code: 'T_WEBHOOK_1',
      amount: 1000,
      status: 'pending',
      paid_at: null,
      metadata: null,
    });

    const payload = JSON.stringify({
      event: 'transfer.success',
      data: {
        transfer_code: 'T_WEBHOOK_1',
        status: 'success',
        amount: 1000
      }
    });

    const signature = crypto.createHmac('sha512', secret).update(payload).digest('hex');

    const res = await request(app)
      .post('/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-paystack-signature', signature)
      .send(payload);

    expect(res.status).toBe(200);

    // Re-fetch record
    const updated = await repo.findByTransferCode('T_WEBHOOK_1');
    expect(updated).not.toBeNull();
    expect(updated?.status.toLowerCase()).toBe('success');
    expect(updated?.paid_at).toBeTruthy();
  });
});