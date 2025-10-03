import express, { Request, Response, NextFunction } from 'express';
import PaymentsService from '../services/payments';
import { verifyPaystackSignature } from '../utils/paystack';

const router = express.Router();
const service = new PaymentsService();

/**
 * POST /payments/initialize
 * Body: { email: string, amount: number }
 */
router.post('/initialize', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, amount } = req.body;

    // Basic validation with clear error codes/messages
    if (!email || typeof email !== 'string') {
      return res.status(422).json({ error: 'email is required and must be a string' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(422).json({ error: 'email is invalid' });
    }

    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(422).json({ error: 'amount must be a positive number' });
    }

    const data = await service.initializeTransaction(email, amount);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return next(err);
  }
});

/**
 * GET /payments/verify/:reference
 */
router.get('/verify/:reference', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reference } = req.params;
    if (!reference) return res.status(400).json({ error: 'reference parameter is required' });

    const data = await service.verifyTransaction(reference);
    return res.status(200).json({ success: true, data });
  } catch (err: any) {
    return next(err);
  }
});

/**
 * POST /payments/webhook
 * Paystack sends a header 'x-paystack-signature' containing sha512 HMAC of the raw body.
 * This route verifies signature and logs events (simulated publish).
 */
router.post('/webhook', express.raw({ type: '*/*' }), async (req: Request, res: Response) => {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    if (!signature) {
      console.warn('Missing Paystack webhook signature');
      return res.status(400).send('Missing signature');
    }

    const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

    const ok = verifyPaystackSignature(payload, signature);
    if (!ok) {
      console.warn('Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Parse event safely
    let event: any = null;
    try {
      event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    } catch (parseErr) {
      console.warn('Failed to parse webhook payload', parseErr);
      return res.status(400).send('Invalid payload');
    }

    console.log('Received Paystack webhook event:', event.event || 'unknown', event);

    // Attempt to reconcile transfer events with persisted salary payments
    try {
      // lazy-load repository to avoid circular deps in small project
      const { SalaryPaymentRepository } = await import('../models/salaryPayment');
      const paymentRepo = new SalaryPaymentRepository();

      const evtName: string = (event.event || '').toString();
      const data = event.data || {};

      // Handle transfer events from Paystack
      if (evtName.startsWith('transfer')) {
        const transferCode = data.transfer_code || data.reference || '';
        const status = (data.status || '').toString().toLowerCase();
        const now = new Date().toISOString();

        if (transferCode) {
          // Update persisted record if exists, otherwise log for manual review
          const existing = await paymentRepo.findByTransferCode(transferCode);
          if (existing) {
            const patch: any = { status: status };
            if (status === 'success') patch.paid_at = now;
            patch.metadata = data;
            await paymentRepo.updateByTransferCode(transferCode, patch);
            console.log('[WEBHOOK] reconciled transfer:', transferCode, status);
          } else {
            console.warn('[WEBHOOK] transfer record not found for code:', transferCode);
          }
        }
      }

      // Simulate publishing an event to other services (log)
      console.log('[EVENT] publish -> Order/HR service:', event.event || 'unknown');
    } catch (rcErr) {
      console.error('Webhook reconciliation error', rcErr);
      // continue — we still acknowledge the webhook to Paystack to avoid retries
    }

    // Acknowledge quickly
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handling error', err);
    return res.status(500).send('error');
  }
});

export default router;