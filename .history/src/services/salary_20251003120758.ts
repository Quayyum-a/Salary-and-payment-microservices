
import axios from 'axios';
import EmployeeRepository from '../models/employee';

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
 * - Keeps an in-memory record of monthly payments to enforce "once per month" rule.
 *
 * Note: This is a clear, test-friendly implementation. In production you'd persist transfer
 * records in a database (e.g., Supabase) and handle retries, idempotency and errors accordingly.
 */
export class SalaryService {
  private repo: EmployeeRepository;
  private payments: Record<string, string>; // employeeId -> 'YYYY-MM' of last payment
  private readonly baseUrl: string;

  constructor(repo?: EmployeeRepository) {
    this.repo = repo || new EmployeeRepository();
    this.payments = {};
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
   * Enforces the rule: one payment per employee per calendar month.
   */
  public async payEmployee(employeeId: string): Promise<TransferResult> {
    const emp = await this.repo.getById(employeeId);
    if (!emp) throw new Error('Employee not found');

    const monthKey = this.getMonthKey();
    if (this.payments[employeeId] === monthKey) {
      throw new Error('Employee already paid this month');
    }

    // Create recipient then initiate transfer
    const recipientCode = await this.createRecipient(emp);
    const transfer = await this.initiateTransfer(recipientCode, Number(emp.salary_amount), `Salary for ${monthKey}`);

    // Record payment (in-memory)
    this.payments[employeeId] = monthKey;

    return {
      transfer_code: transfer.transfer_code,
      status: transfer.status,
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