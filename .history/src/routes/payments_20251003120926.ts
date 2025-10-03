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
    if (!email || typeof amount !== 'number') {
      return res.status(400).json({ message: 'email and amount are required (amount must be number)' });
    }
    const data = await service.initializeTransaction(email, amount);
    return res.status(200).json(data);
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
    const data = await service.verifyTransaction(reference);
    return res.json(data);
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
    const payload = req.body instanceof Buffer ? req.body.toString('utf8') : JSON.stringify(req.body);

    const ok = verifyPaystackSignature(payload, signature);
    if (!ok) {
      console.warn('Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }

    // Parse event
    const event = typeof payload === 'string' ? JSON.parse(payload) : payload;
    console.log('Received Paystack webhook event:', event.event || 'unknown', event);
    // Simulate publishing an event to other services
    console.log('[EVENT] publish -> Order/HR service:', event.event);

    // Acknowledge
    return res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handling error', err);
    return res.status(500).send('error');
  }
});

export default router;