import { randomUUID } from 'crypto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Employee entity
 */
export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  account_number: string;
  bank_code: string;
  salary_amount: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Simple repository that uses Supabase when configured, otherwise falls back to in-memory store.
 * This makes tests fast and local without requiring a Supabase instance.
 */
export class EmployeeRepository {
  private supabase?: SupabaseClient;
  private inMemory: Employee[] = [];

  constructor(supabaseClient?: SupabaseClient) {
    if (supabaseClient) {
      this.supabase = supabaseClient;
    } else if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    }
  }

  /**
   * Improved validation:
   * - email must be a valid format
   * - Nigerian phone formats accepted: leading 0, 234 or +234 followed by 10 digits
   * - account_number is 10 digits (common for Nigerian banks)
   * - bank_code must be 3 digits
   * - salary_amount must be a positive number
   *
   * Throws Error with clear message on validation failure.
   */
  private validateInput(payload: Partial<Employee>) {
    if (!payload.name || String(payload.name).trim().length === 0) {
      throw new Error('Name is required');
    }

    if (!payload.email || String(payload.email).trim().length === 0) {
      throw new Error('Email is required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(payload.email || '')) {
      throw new Error('Email is invalid');
    }

    if (!payload.phone || String(payload.phone).trim().length === 0) {
      throw new Error('Phone is required');
    }
    // Accept formats: 08012345678, 8012345678 (rare), +2348012345678, 2348012345678
    const ngPhone = /^(?:\+234|234|0)\d{10}$/;
    if (!ngPhone.test(String(payload.phone))) {
      throw new Error('Phone must be a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)');
    }

    if (!payload.account_number || !/^\d{10}$/.test(String(payload.account_number))) {
      throw new Error('Account number must be 10 digits (numeric)');
    }

    if (!payload.bank_code || !/^\d{3}$/.test(String(payload.bank_code))) {
      throw new Error('Bank code must be a 3-digit code');
    }

    if (typeof payload.salary_amount !== 'number' || Number.isNaN(payload.salary_amount) || payload.salary_amount <= 0) {
      throw new Error('salary_amount must be a positive number');
    }
  }

  public async create(payload: Omit<Employee, 'id' | 'created_at' | 'updated_at'>): Promise<Employee> {
    this.validateInput(payload as Partial<Employee>);
    const now = new Date().toISOString();
    const employee: Employee = {
      id: randomUUID(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      account_number: payload.account_number,
      bank_code: payload.bank_code,
      salary_amount: payload.salary_amount,
      created_at: now,
      updated_at: now,
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('employees')
        .insert({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          phone: employee.phone,
          account_number: employee.account_number,
          bank_code: employee.bank_code,
          salary_amount: employee.salary_amount,
          created_at: employee.created_at,
          updated_at: employee.updated_at,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Employee;
    }

    this.inMemory.push(employee);
    return employee;
  }

  public async getById(id: string): Promise<Employee | null> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('employees').select('*').eq('id', id).single();
      if (error) {
        if ((error as any).code === 'PGRST116') return null;
        throw error;
      }
      return data as Employee;
    }

    const found = this.inMemory.find((e) => e.id === id);
    return found ?? null;
  }

  public async list(): Promise<Employee[]> {
    if (this.supabase) {
      const { data, error } = await this.supabase.from('employees').select('*');
      if (error) throw error;
      return data as Employee[];
    }

    return [...this.inMemory];
  }
}

export default EmployeeRepository;