import axios from 'axios';
import EmployeeRepository from '../models/employee';
import SalaryPaymentRepository from '../models/salaryPayment';

/**
 * Result shape returned after a transfer
 */
export interface TransferResult {
  transfer_code: string;
  status: string;
  recipient?: string;
  amount?: number;
}

/**
 * SalaryService
 * - Creates transfer recipients and initiates transfers via Paystack Transfers API.
 * - Persists salary payment records via SalaryPaymentRepository to enforce "once per month" rule.
 *
 * Note: This implementation remains simple and testable. It accepts repositories via constructor
 * so tests can inject in-memory implementations.
 */
export class SalaryService {
  private repo: EmployeeRepository;
  private paymentRepo: SalaryPaymentRepository;
  private readonly baseUrl: string;

  constructor(repo?: EmployeeRepository, paymentRepo?: SalaryPaymentRepository) {
    this.repo = repo || new EmployeeRepository();
    this.paymentRepo = paymentRepo || new SalaryPaymentRepository();
    this.baseUrl = 'https://api.paystack.co';
  }

  private getMonthKey(date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private async createRecipient(emp: any): Promise<string> {
    const url = `${this.baseUrl}/transferrecipient`;
    const body = {
      type: 'nuban',
      name: emp.name,
      account_number: emp.account_number,
      bank_code: emp.bank_code,
      currency: 'NGN',
    };
    const headers = { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || ''}` };

    const resp = await axios.post(url, body, { headers });
    if (!resp || !resp.data) throw new Error('No response from Paystack when creating recipient');
    if (!resp.data.status) throw new Error(resp.data.message || 'Failed to create recipient');
    return resp.data.data.recipient_code;
  }

  private async initiateTransfer(recipientCode: string, amount: number, reason?: string): Promise<any> {
    const url = `${this.baseUrl}/transfer`;
    const body = {
      source: 'balance',
      amount,
      recipient: recipientCode,
      reason: reason || 'Salary disbursement',
    };
    const headers = { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || ''}` };

    const resp = await axios.post(url, body, { headers });
    if (!resp || !resp.data) throw new Error('No response from Paystack when initiating transfer');
    if (!resp.data.status) throw new Error(resp.data.message || 'Failed to initiate transfer');
    return resp.data.data;
  }

  /**
   * Pay a single employee.
   * Enforces the rule: one successful payment per employee per calendar month (persisted).
   */
  public async payEmployee(employeeId: string): Promise<TransferResult> {
    const emp = await this.repo.getById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const monthKey = this.getMonthKey();

    // Check persisted payments for this employee in the current month
    const existing = await this.paymentRepo.findByEmployeeAndMonth(employeeId, monthKey);
    const alreadySuccess = existing.some((r: any) => (r.status || '').toLowerCase() === 'success');
    if (alreadySuccess) {
      throw new Error('Employee already paid this month');
    }

    // Create recipient then initiate transfer
    const recipientCode = await this.createRecipient(emp);
    const transfer = await this.initiateTransfer(recipientCode, Number(emp.salary_amount), `Salary for ${monthKey}`);

    // Persist payment record
    await this.paymentRepo.create({
      employee_id: employeeId,
      transfer_code: transfer.transfer_code,
      amount: transfer.amount ?? Number(emp.salary_amount),
      status: transfer.status ?? 'pending',
      paid_at: transfer.status === 'success' ? new Date().toISOString() : null,
      metadata: transfer,
    });

    return {
      transfer_code: transfer.transfer_code,
      status: transfer.status,
      recipient: recipientCode,
      amount: transfer.amount ?? Number(emp.salary_amount),
    };
  }

  /**
   * Pay all employees (iterates repository and attempts payment for each).
   * Returns an array of results or error objects per employee.
   */
  public async payAll(): Promise<(TransferResult | { employeeId: string; error: string })[]> {
    const employees = await this.repo.list();
    const results: (TransferResult | { employeeId: string; error: string })[] = [];

    for (const emp of employees) {
      try {
        const res = await this.payEmployee(emp.id);
        results.push(res);
      } catch (err: any) {
        // Continue with next employee; surface error per employee
        results.push({ employeeId: emp.id, error: err.message || 'Payment failed' });
      }
    }

    return results;
  }

  /**
   * Check transfer status by transfer code (calls Paystack)
   */
  public async getTransferStatus(transferCode: string): Promise<any> {
    const url = `${this.baseUrl}/transfer/${encodeURIComponent(transferCode)}`;
    const headers = { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY || ''}` };
    const resp = await axios.get(url, { headers });
    if (!resp || !resp.data) throw new Error('No response from Paystack');
    if (!resp.data.status) throw new Error(resp.data.message || 'Failed to fetch transfer status');
    return resp.data.data;
  }
}

export default SalaryService;