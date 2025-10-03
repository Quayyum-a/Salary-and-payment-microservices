import nock from 'nock';
import EmployeeRepository from '../../src/models/employee';
import SalaryService from '../../src/services/salary';
import { SalaryPaymentRepository } from '../../src/models/salaryPayment';

describe('Salary persistence (TDD)', () => {
  const base = 'https://api.paystack.co';
  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_mock';
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('persists a salary payment record after paying an employee', async () => {
    const empRepo = new EmployeeRepository();
    const paymentRepo = new SalaryPaymentRepository(); // expected to be implemented
    const emp = await empRepo.create({
      name: 'Persist Payee',
      email: 'persist@example.com',
      phone: '08010000000',
      account_number: '0123456789',
      bank_code: '057',
      salary_amount: 200000,
    } as any);

    // mock Paystack transferrecipient + transfer
    nock(base).post('/transferrecipient').reply(200, { status: true, message: 'ok', data: { recipient_code: 'R_PERSIST' } });
    nock(base).post('/transfer').reply(200, { status: true, message: 'ok', data: { transfer_code: 'T_PERSIST', status: 'success' } });

    const salarySvc = new SalaryService(empRepo, paymentRepo); // new constructor signature expected
    const res = await salarySvc.payEmployee(emp.id);

    expect(res.transfer_code).toBe('T_PERSIST');
    // Verify a persisted payment record exists for this employee and month
    const monthKey = new Date().toISOString().slice(0,7); // YYYY-MM
    const records = await paymentRepo.findByEmployeeAndMonth(emp.id, monthKey);
    expect(Array.isArray(records)).toBe(true);
    expect(records.length).toBeGreaterThanOrEqual(1);
    const rec = records.find(r => r.transfer_code === 'T_PERSIST');
    expect(rec).toBeDefined();
    expect(rec?.status).toBe('success');
  });
});