import { Router } from 'express';
import { createCustomerOrder, createCustomerOrderMessage, getCustomerCoffeeGrades, getCustomerCoffeeVarieties, getCustomerOrderByReference } from '../controllers/customerController';

const router = Router();

router.post('/orders', createCustomerOrder);
router.get('/coffee-varieties', getCustomerCoffeeVarieties);
router.get('/coffee-grades', getCustomerCoffeeGrades);
router.get('/orders/:referenceCode', getCustomerOrderByReference);
router.post('/orders/:referenceCode/messages', createCustomerOrderMessage);

export default router;
