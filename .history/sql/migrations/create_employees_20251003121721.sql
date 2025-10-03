-- Supabase migration: create employees table
-- Run with psql or Supabase SQL editor
-- Schema follows requested shape:
-- id UUID PRIMARY KEY,
-- name VARCHAR(100),
-- email VARCHAR(100) UNIQUE,
-- phone VARCHAR(20),
-- account_number VARCHAR(20),
-- bank_code VARCHAR(10),
-- salary_amount DECIMAL(12,2),
-- created_at TIMESTAMP,
-- updated_at TIMESTAMP

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY,
  name varchar(100) NOT NULL,
  email varchar(100) NOT NULL UNIQUE,
  phone varchar(20),
  account_number varchar(20) NOT NULL,
  bank_code varchar(10) NOT NULL,
  salary_amount numeric(12,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Triggers to update updated_at on row change (optional convenience)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.employees;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees (email);
CREATE INDEX IF NOT EXISTS idx_employees_created_at ON public.employees (created_at);