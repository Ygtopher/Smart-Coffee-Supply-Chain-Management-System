export type DeliveryPaymentMatchInput = {
  deliveryId: string;
  weightKg: unknown;
  pricePerKg: unknown;
  deliveryDate?: Date | string | null;
};

export type PaymentMatchInput = {
  txId: string;
  deliveryId?: string | null;
  amount: unknown;
  status?: string | null;
  referenceCode?: string | null;
  processedAt?: Date | string | null;
};

const paidStatuses = new Set(['PAID', 'COMPLETED']);
const pendingStatuses = new Set(['PENDING', 'INITIATED']);

const numberValue = (value: unknown) => Number(value || 0);

const paymentStatusRank = (status?: string | null) => {
  const normalized = String(status || '').toUpperCase();
  if (paidStatuses.has(normalized)) return 3;
  if (pendingStatuses.has(normalized)) return 2;
  if (normalized) return 1;
  return 0;
};

const timestampValue = (value?: Date | string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
};

const paymentSortScore = (delivery: DeliveryPaymentMatchInput, payment: PaymentMatchInput) => {
  const deliveryTime = timestampValue(delivery.deliveryDate);
  const paymentTime = timestampValue(payment.processedAt);
  return {
    rank: paymentStatusRank(payment.status),
    distance: deliveryTime !== null && paymentTime !== null ? Math.abs(paymentTime - deliveryTime) : Number.MAX_SAFE_INTEGER,
    time: paymentTime || 0,
  };
};

const sortPaymentsForDelivery = <T extends PaymentMatchInput>(delivery: DeliveryPaymentMatchInput, payments: T[]) =>
  [...payments].sort((a, b) => {
    const aScore = paymentSortScore(delivery, a);
    const bScore = paymentSortScore(delivery, b);
    return bScore.rank - aScore.rank || aScore.distance - bScore.distance || bScore.time - aScore.time;
  });

export const deliveryTotalAmount = (delivery: DeliveryPaymentMatchInput) =>
  numberValue(delivery.weightKg) * numberValue(delivery.pricePerKg);

export const paymentReferencesDelivery = (payment: PaymentMatchInput, delivery: DeliveryPaymentMatchInput) => {
  if (payment.deliveryId && payment.deliveryId === delivery.deliveryId) {
    return true;
  }

  const reference = String(payment.referenceCode || '').toUpperCase();
  const deliveryId = String(delivery.deliveryId || '').toUpperCase();
  const deliveryPrefix = deliveryId.slice(0, 8);
  return Boolean(reference && deliveryId && (reference.includes(deliveryId) || reference.includes(deliveryPrefix)));
};

export const matchPaymentForDelivery = <T extends PaymentMatchInput>(
  delivery: DeliveryPaymentMatchInput,
  payments: T[],
  usedTxIds = new Set<string>(),
) => {
  const availablePayments = payments.filter((payment) => !usedTxIds.has(payment.txId));
  const directReferenceMatches = availablePayments.filter((payment) => paymentReferencesDelivery(payment, delivery));
  if (directReferenceMatches.length > 0) {
    return sortPaymentsForDelivery(delivery, directReferenceMatches)[0];
  }

  const deliveryAmount = deliveryTotalAmount(delivery);
  const exactAmountMatches = availablePayments.filter((payment) => Math.abs(numberValue(payment.amount) - deliveryAmount) < 0.01);
  return exactAmountMatches.length > 0 ? sortPaymentsForDelivery(delivery, exactAmountMatches)[0] : null;
};

export const normalizedPaymentStatus = (payment?: PaymentMatchInput | null) =>
  payment ? String(payment.status || 'PENDING').toLowerCase() : 'pending';
