import axios from 'axios';
import EmployeeRepository from '../src/models/employee';
import { SalaryService } from '../src/services/salary';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SalaryService (Paystack Transfers)', () => {
  beforeAll(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_for_transfers';
  });

  afterEach(() => {
    mockedAxios.post.mockReset();
    mockedAxios.get.mockReset();
  });

  it('pays a single employee (creates recipient then initiates transfer)', async () => {
    const repo = new EmployeeRepository();
    const emp = await repo.create({
      name: 'Alice',
      email: 'alice@example.com',
      phone: '08011111111',
      account_number: '0123456789',
      bank_code: '057',
      salary_amount: 150000,
    } as any);

    // Mock transfer recipient creation response
    const recipientResp = {
      data: {
        status: true,
        message: 'Recipient created',
        data: {
          recipient_code: 'RCP_123',
        },
      },
    };

    // Mock transfer initiation response
    const transferResp = {
      data: {
        status: true,
        message: 'Transfer queued',
        data: {
          transfer_code: 'TRF_123',
          status: 'success',
        },
      },
    };

    // First axios.post => create recipient, second axios.post => initiate transfer
    mockedAxios.post.mockResolvedValueOnce(recipientResp).mockResolvedValueOnce(transferResp);

    const salaryService = new SalaryService(repo);
    const res = await salaryService.payEmployee(emp.id);

    expect(res).toHaveProperty('transfer_code', 'TRF_123');
    expect(res).toHaveProperty('status', 'success');
    expect(mockedAxios.post).toHaveBeenCalledTimes(2);
  });

  it('prevents paying same employee twice within the same month', async () => {
    const repo = new EmployeeRepository();
    const emp = await repo.create({
      name: 'Bob',
      email: 'bob@example.com',
      phone: '08022222222',
      account_number: '0987654321',
      bank_code: '033',
      salary_amount: 120000,
    } as any);

    const recipientResp = {
      data: { status: true, message: 'Recipient created', data: { recipient_code: 'RCP_456' } },
    };
    const transferResp = {
      data: { status: true, message: 'Transfer queued', data: { transfer_code: 'TRF_456', status: 'success' } },
    };

    mockedAxios.post.mockResolvedValueOnce(recipientResp).mockResolvedValueOnce(transferResp);

    const salaryService = new SalaryService(repo);
    const first = await salaryService.payEmployee(emp.id);
    expect(first.transfer_code).toBe('TRF_456');

    // Attempt second payment in same month - should throw
    await expect(salaryService.payEmployee(emp.id)).rejects.toThrow(/already paid/i);
  });

  it('pay-all processes multiple employees', async () => {
    const repo = new EmployeeRepository();
    const e1 = await repo.create({
      name: 'C1',
      email: 'c1@example.com',
      phone: '08033333333',
      account_number: '1111111111',
      bank_code: '044',
      salary_amount: 100000,
    } as any);

    const e2 = await repo.create({
      name: 'C2',
      email: 'c2@example.com',
      phone: '08044444444',
      account_number: '2222222222',
      bank_code: '058',
      salary_amount: 90000,
    } as any);

    // For each employee, two axios.post calls (recipient + transfer) → 4 calls total
    mockedAxios.post
      .mockResolvedValueOnce({ data: { status: true, message: 'Recipient', data: { recipient_code: 'R1' } } })
      .mockResolvedValueOnce({ data: { status: true, message: 'Transfer', data: { transfer_code: 'T1', status: 'success' } } })
      .mockResolvedValueOnce({ data: { status: true, message: 'Recipient', data: { recipient_code: 'R2' } } })
      .mockResolvedValueOnce({ data: { status: true, message: 'Transfer', data: { transfer_code: 'T2', status: 'success' } } });

    const salaryService = new SalaryService(repo);
    const results = await salaryService.payAll();

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(2);
    const codes = results.map((r: any) => r.transfer_code);
    expect(codes).toEqual(expect.arrayContaining(['T1', 'T2']));
    expect(mockedAxios.post).toHaveBeenCalledTimes(4);
  });
});