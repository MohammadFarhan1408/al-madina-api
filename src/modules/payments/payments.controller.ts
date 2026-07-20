import type { Request, Response } from 'express';
import { paymentsService } from './payments.service';
import { sendSuccess } from '../../utils/api-response';

export const paymentsController = {
  /** POST /payments/callback — simulated-gateway webhook stand-in (signature
   * verified by the verifyWebhookSignature middleware before this runs). */
  async callback(req: Request, res: Response): Promise<void> {
    const { transactionId, status, providerReference } = req.body;
    const transaction = await paymentsService.handleSimulatedCallback(transactionId, status, providerReference);
    sendSuccess(res, transaction);
  },
};
