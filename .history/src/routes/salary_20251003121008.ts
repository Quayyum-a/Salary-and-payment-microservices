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
      if (!employeeId) return res.status(400).json({ message: 'employeeId required' });

      const result = await salaryService.payEmployee(employeeId);
      // Simulate publish event for HR/Payroll
      console.log('[EVENT] salary.paid', { employeeId, transfer: result });
      return res.status(200).json(result);
    } catch (err: any) {
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
      return res.status(200).json(results);
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
      if (!transferCode) return res.status(400).json({ message: 'transferCode required' });

      const status = await salaryService.getTransferStatus(transferCode);
      return res.status(200).json(status);
    } catch (err: any) {
      return next(err);
    }
  }
);

export default router;
