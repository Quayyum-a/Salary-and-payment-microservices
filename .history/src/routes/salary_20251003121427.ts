import express, { Request, Response, NextFunction } from 'express';
import authMiddleware from '../middleware/auth';
import SalaryService from '../services/salary';
import EmployeeRepository from '../models/employee';

const router = express.Router();
const repo = new EmployeeRepository();
const salaryService = new SalaryService(repo);

/**
 * POST /salary/pay/:employeeId
 * Protected: Admin, HR
 */
router.post(
  '/pay/:employeeId',
  authMiddleware(['Admin', 'HR']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { employeeId } = req.params;
      if (!employeeId) {
        return res.status(422).json({ error: 'employeeId is required' });
      }

      // Basic UUID v4-ish validation
      const uuidRegex = /^[0-9a-fA-F-]{36}$/;
      if (!uuidRegex.test(employeeId)) {
        return res.status(422).json({ error: 'employeeId must be a valid UUID' });
      }

      const result = await salaryService.payEmployee(employeeId);
      // Simulate publish event for HR/Payroll
      console.log('[EVENT] salary.paid', { employeeId, transfer: result });
      return res.status(200).json({ success: true, data: result });
    } catch (err: any) {
      // Map common errors to HTTP status codes
      if (err.message && /not found/i.test(err.message)) {
        return res.status(404).json({ error: err.message });
      }
      if (err.message && /already paid/i.test(err.message)) {
        return res.status(409).json({ error: err.message });
      }
      return next(err);
    }
  }
);

/**
 * POST /salary/pay-all
 * Protected: Admin, HR
 */
router.post(
  '/pay-all',
  authMiddleware(['Admin', 'HR']),
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await salaryService.payAll();
      console.log('[EVENT] salary.bulk_run', { results });
      return res.status(200).json({ success: true, results });
    } catch (err: any) {
      return next(err);
    }
  }
);

/**
 * GET /salary/status/:transferCode
 * Protected: Admin, HR
 */
router.get(
  '/status/:transferCode',
  authMiddleware(['Admin', 'HR']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { transferCode } = req.params;
      if (!transferCode) return res.status(422).json({ error: 'transferCode is required' });

      const status = await salaryService.getTransferStatus(transferCode);
      return res.status(200).json({ success: true, data: status });
    } catch (err: any) {
      if (err.message && /No response from Paystack/i.test(err.message)) {
        return res.status(502).json({ error: 'Upstream Paystack error' });
      }
      return next(err);
    }
  }
);

export default router;