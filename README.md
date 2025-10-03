# Salary & Payment Microservice

A simple Node.js + TypeScript microservice that:
- Stores employee details (salary & bank info)
- Accepts customer payments via Paystack Transactions
- Disburses salaries via Paystack Transfers
- Publishes events (simulated logs) for integration with other services

Tech
- Node.js, TypeScript, Express
- Supabase (optional) as DB
- Paystack integration via Axios
- JWT for auth
- Jest for tests

Quickstart (local)
1. Install
   npm install
2. Configure
   - Copy or edit `.env` at repository root and set:
     - SUPABASE_URL, SUPABASE_KEY (optional)
     - PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY
     - PAYSTACK_WEBHOOK_SECRET
     - JWT_SECRET
     - USE_SUPABASE=false (for in-memory mode)
3. Run migrations (if using Supabase)
   psql "<your-connection-string>" -f sql/migrations/create_employees.sql
   psql "<your-connection-string>" -f sql/migrations/create_salary_payments.sql
4. Start
   npm run dev
5. Run tests
   npm test

Important env variables
- PORT (default 3000)
- SUPABASE_URL, SUPABASE_KEY
- PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, PAYSTACK_WEBHOOK_SECRET
- JWT_SECRET, JWT_EXPIRY
- USE_SUPABASE (true/false)

Main endpoints (core)
- Health
  - GET /health
- Employees
  - POST /employees
  - GET /employees
  - GET /employees/:id
- Payments
  - POST /payments/initialize
  - GET /payments/verify/:reference
  - POST /payments/webhook
- Salary
  - POST /salary/pay/:employeeId (Admin/HR)
  - POST /salary/pay-all (Admin/HR)
  - GET /salary/status/:transferCode (Admin/HR)




