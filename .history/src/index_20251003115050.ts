import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import EmployeeRepository from './models/employee';

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Repository instance.
 * Uses Supabase if SUPABASE_URL & SUPABASE_KEY are present, otherwise in-memory store.
 */
const repo = new EmployeeRepository();

/**
 * Health check
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Create employee
 * Example request body:
 * {
 *   "name":"John",
 *   "email":"john@example.com",
 *   "phone":"08012345678",
 *   "account_number":"0123456789",
 *   "bank_code":"057",
 *   "salary_amount":500000
 * }
 */
app.post('/employees', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    const created = await repo.create(payload);
    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

/**
 * List employees
 */
app.get('/employees', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await repo.list();
    return res.json(list);
  } catch (err) {
    return next(err);
  }
});

/**
 * Get employee by id
 */
app.get('/employees/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const emp = await repo.getById(req.params.id);
    if (!emp) return res.status(404).json({ message: 'Employee not found' });
    return res.json(emp);
  } catch (err) {
    return next(err);
  }
});

/**
 * Basic error handler
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err.status || 400;
  res.status(status).json({ error: err.message || 'Bad Request' });
});

const PORT = process.env.PORT || 3000;

/**
 * Start server when run directly.
 */
if (require.main === module) {
  app.listen(Number(PORT), () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
  });
}

export default app;