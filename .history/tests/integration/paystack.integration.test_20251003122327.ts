import nock from 'nock';
import PaymentsService from '../../src/services/payments';
import SalaryService from '../../src/services/salary';
import EmployeeRepository from '../../src/models/employee';

describe('Integration tests with mocked Paystack (nock)', () => {
  const base = 'https://api.paystack.co';
  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('initializes and verifies a payment via Paystack', async () => {
    const svc = new PaymentsService();
    const email = 'int@example.com';
    const amount = 1000;

    nock(base)
      .post('/transaction/initialize', { email, amount })
      .reply(200, { status: true, message: 'ok', data: { authorization_url: 'https://paystack/checkout', reference: 'int_ref' } });

    nock(base)
      .get('/transaction/verify/int_ref')
      .reply(200, { status: true, message: 'ok', data: { status: 'success', reference: 'int_ref', amount } });

    const init = await svc.initializeTransaction(email, amount);
    expect(init.reference).toBe('int_ref');

    const verify = await svc.verifyTransaction('int_ref');
    expect(verify.reference).toBe('int_ref');
    expect(verify.status).toBe('success');
  });

  it('creates recipient and initiates transfer for salary', async () => {
    const repo = new EmployeeRepository();
    const emp = await repo.create({
      name: 'Int Payee',
      email: 'payee@example.com',
      phone: '08010000000',
      account_number: '0123456789',
      bank_code: '057',
      salary_amount: 200000,
    } as any);

    nock(base)
      .post('/transferrecipient')
      .reply(200, { status: true, message: 'recipient', data: { recipient_code: 'R_INTEGRATION' } });

    nock(base)
      .post('/transfer')
      .reply(200, { status: true, message: 'transfer', data: { transfer_code: 'T_INTEGRATION', status: 'success' } });

    const salarySvc = new SalaryService(repo);
    const res = await salarySvc.payEmployee(emp.id);
    expect(res.transfer_code).toBe('T_INTEGRATION');
    expect(res.status).toBe('success');
  });
});