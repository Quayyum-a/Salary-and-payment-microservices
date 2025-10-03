-- Supabase migration: create employees table
-- Run with psql or Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  account_number text NOT NULL,
  bank_code text NOT NULL,
  salary_amount numeric NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees (created_at);