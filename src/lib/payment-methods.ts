// Shared constants/types for manual payment methods. Deliberately kept out
// of queries/payment-accounts.ts (which is `server-only`) so Client
// Components can import them too -- same split as lib/order-status.ts vs
// queries/orders.ts.

export const PAYMENT_METHODS = ['bank', 'easypaisa', 'jazzcash'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank: 'Bank Transfer',
  easypaisa: 'Easypaisa',
  jazzcash: 'JazzCash',
};

export type PaymentAccount = {
  id: string;
  method: PaymentMethod;
  label: string;
  account_title: string;
  account_number: string;
  bank_name: string | null;
  iban: string | null;
  instructions: string | null;
  active: boolean;
  sort_order: number;
};
