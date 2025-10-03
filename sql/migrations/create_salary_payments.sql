-- Migration: create salary_payments table
-- Stores salary transfer attempts / results so we can enforce monthly-once rule and reconcile webhooks.
-- Run with psql or Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.salary_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  transfer_code text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL,
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Foreign key to employees table (if employees table exists)
ALTER TABLE public.salary_payments
  ADD CONSTRAINT fk_salary_employee
  FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_salary_payments_employee_created_at ON public.salary_payments (employee_id, created_at);
CREATE INDEX IF NOT EXISTS idx_salary_payments_transfer_code ON public.salary_payments (transfer_code);