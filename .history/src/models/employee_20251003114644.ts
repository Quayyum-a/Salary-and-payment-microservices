
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

  private validateInput(payload: Partial<Employee>) {
    if (!payload.name) throw new Error('Name is required');
    if (!payload.email) throw new Error('Email is required');
    if (!payload.account_number || !/^\d{6,12}$/.test(payload.account_number))
      throw new Error('Account number must be numeric (6-12 digits)');
    if (!payload.bank_code || !/^\d{3}$/.test(payload.bank_code))
      throw new Error('Bank code must be a 3-digit code');
    if (typeof payload.salary_amount !== 'number' || payload.salary_amount <= 0)
      throw new Error('salary_amount must be a positive number');
  }

  public async create(payload: Omit<Employee, 'id' | 'created_at'>): Promise<Employee> {
    this.validateInput(payload as Partial<Employee>);
    const employee: Employee = {
      id: randomUUID(),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      account_number: payload.account_number,
      bank_code: payload.bank_code,
      salary_amount: payload.salary_amount,
      created_at: new Date().toISOString(),
    };

    if (this.supabase) {
      const { data, error } = await this.supabase
        .from('employees')
        .insert({
