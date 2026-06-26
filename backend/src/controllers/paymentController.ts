import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';

// Mock mobile money provider response delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const checkPaymentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { provider, phoneNumber, amount } = req.body;
    
    if (!provider || !phoneNumber || !amount) {
      res.status(400).json({ success: false, message: 'Missing required parameters' });
      return;
    }

    // Simulate network delay to mobile money API
    await delay(1500);

    // Mock API interaction with MTN MoMo or Airtel Money
    if (provider === 'MTN') {
      console.log(`[MTN MoMo API] Checking status for ${phoneNumber} - Amount: ${amount}`);
      // Simulate 80% success rate
      if (Math.random() > 0.2) {
        res.status(200).json({ success: true, status: 'SUCCESS', transactionId: `MTN-${Date.now()}` });
      } else {
        res.status(200).json({ success: true, status: 'PENDING', message: 'Waiting for user confirmation' });
      }
    } else if (provider === 'AIRTEL') {
      console.log(`[Airtel Money API] Checking status for ${phoneNumber} - Amount: ${amount}`);
      if (Math.random() > 0.2) {
        res.status(200).json({ success: true, status: 'SUCCESS', transactionId: `ART-${Date.now()}` });
      } else {
        res.status(200).json({ success: true, status: 'FAILED', message: 'Insufficient funds' });
      }
    } else {
      res.status(400).json({ success: false, message: 'Invalid provider. Use MTN or AIRTEL.' });
    }
  } catch (error) {
    console.error('Error in mobile money API:', error);
    res.status(500).json({ success: false, message: 'Payment gateway error' });
  }
};

export const initiatePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { provider, phoneNumber, amount } = req.body;
    
    // Simulate network delay to mobile money API
    await delay(2000);

    if (provider === 'MTN') {
      res.status(200).json({ 
        success: true, 
        message: 'Payment push sent. Please approve on your phone.',
        reference: `REQ-${Date.now()}`
      });
    } else if (provider === 'AIRTEL') {
      res.status(200).json({ 
        success: true, 
        message: 'USSD prompt sent. Please enter PIN.',
        reference: `REQ-${Date.now()}`
      });
    } else {
      res.status(400).json({ success: false, message: 'Unsupported provider' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to initiate payment' });
  }
};
