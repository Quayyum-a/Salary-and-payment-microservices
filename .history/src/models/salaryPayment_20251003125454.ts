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
          transfer_code: rec.transfer_code,
          amount: rec.amount,
          status: rec.status,
          paid_at: rec.paid_at,
          created_at: rec.created_at,
          metadata: rec.metadata,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SalaryPaymentRecord;
    }

    this.inMemory.push(rec);
    return rec;
  }

  /**
   * Find payment records for an employee within a given month key "YYYY-MM".
   * For in-memory store, checks created_at month; for DB, queries created_at timestamp.
   */
  public async findByEmployeeAndMonth(employeeId: string, monthKey: string): Promise<SalaryPaymentRecord[]> {
    if (this.supabase) {
      const start = `${monthKey}-01T00:00:00Z`;
      // Calculate end as next month first day
      const [year, month] = monthKey.split('-').map((s) => Number(s));
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      const end = `${String(nextYear)}-${String(nextMonth).padStart(2, '0')}-01T00:00:00Z`;

      const { data, error } = await this.supabase
        .from('salary_payments')
        .select('*')
        .eq('employee_id', employeeId)
        .gte('created_at', start)
        .lt('created_at', end);

      if (error) throw error;
      return data as SalaryPaymentRecord[];
    }

    // In-memory filter by employeeId and monthKey (YYYY-MM)
    return this.inMemory.filter((r) => {
      if (!r.created_at) return false;
      if (r.employee_id !== employeeId) return false;
      return r.created_at.startsWith(monthKey);
    });
  }
}

export default SalaryPaymentRepository;