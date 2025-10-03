
import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Salary payment record stored after a transfer is initiated/completed.
 */
export interface SalaryPaymentRecord {
  id: string;
  employee_id: string;
  transfer_code: string;
  amount: number;
  status: string;
  paid_at?: string | null;
  created_at?: string;
  metadata?: any;
}

/**
 * SalaryPaymentRepository
 * - Persists salary payment records to Supabase when configured, otherwise keeps an in-memory store.
 * - Provides helpers to query payments by employee and month.
 */
export class SalaryPaymentRepository {
  private supabase?: SupabaseClient;
  private inMemory: SalaryPaymentRecord[] = [];

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
  }

  /**
   * Create & persist a payment record.
   */
  public async create(payload: Omit<SalaryPaymentRecord, 'id' | 'created_at'>): Promise<SalaryPaymentRecord> {
    const rec: SalaryPaymentRecord = {
      id: randomUUID(),
      employee_id: payload.employee_id,
      transfer_code: payload.transfer_code,
      amount: payload.amount,
      status: payload.status,
      paid_at: payload.paid_at ?? null,
      created_at: new Date().toISOString(),
      metadata: payload.metadata ?? null,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('salary_payments')
        .insert({
          id: rec.id,
          employee_id: rec.employee_id,
