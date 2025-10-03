
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
      throw new Error('Employee has already been paid this month');
    }

    // Create recipient then initiate transfer
    const recipientCode = await this.createRecipient(emp);
