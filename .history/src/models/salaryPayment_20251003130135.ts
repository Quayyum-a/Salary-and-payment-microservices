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
 * - Provides helpers to query payments by employee and month, and update by transfer_code.
 */
export class SalaryPaymentRepository {
  private supabase?: SupabaseClient;
  private static inMemory: SalaryPaymentRecord[] = [];

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

    (SalaryPaymentRepository as any).inMemory.push(rec);
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
    return (SalaryPaymentRepository as any).inMemory.filter((r: SalaryPaymentRecord) => {
      if (!r.created_at) return false;
      if (r.employee_id !== employeeId) return false;
      return r.created_at.startsWith(monthKey);
    });
  }

  /**
   * Find a payment by transfer_code.
   */
  public async findByTransferCode(transferCode: string): Promise<SalaryPaymentRecord | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('salary_payments')
        .select('*')
        .eq('transfer_code', transferCode)
        .limit(1)
        .single();
      if (error) {
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      return data as SalaryPaymentRecord;
    }

    return ((SalaryPaymentRepository as any).inMemory.find((r: SalaryPaymentRecord) => r.transfer_code === transferCode) ?? null) as SalaryPaymentRecord | null;
  }

  /**
   * Update a payment record by transfer_code. Returns the updated record.
   */
  public async updateByTransferCode(transferCode: string, patch: Partial<SalaryPaymentRecord>): Promise<SalaryPaymentRecord | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('salary_payments')
        .update({
          status: patch.status,
          paid_at: patch.paid_at ?? null,
          metadata: patch.metadata ?? null,
        })
        .eq('transfer_code', transferCode)
        .select()
        .single();

      if (error) {
        // If no row found, return null
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      return data as SalaryPaymentRecord;
    }

    const idx = (SalaryPaymentRepository as any).inMemory.findIndex((r: SalaryPaymentRecord) => r.transfer_code === transferCode);
    if (idx === -1) return null;
    const rec = (SalaryPaymentRepository as any).inMemory[idx];
    const updated: SalaryPaymentRecord = {
      ...rec,
      ...patch,
      created_at: rec.created_at ?? new Date().toISOString(),
    };
    (SalaryPaymentRepository as any).inMemory[idx] = updated;
    return updated;
  }
}

export default SalaryPaymentRepository;