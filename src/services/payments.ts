export type PaymentProvider = 'khalti' | 'esewa';
export type PaymentStatus = 'not_started' | 'pending' | 'verification_required' | 'verified' | 'failed';
export type PaymentRequest = {
  amount: number; currency: string; provider: PaymentProvider;
  companionId: string; bookingId: string; returnUrl?: string; webhookUrl?: string;
  customerInfo?: { name: string; email: string; phone: string };
};
export type PaymentVerification = {
  success: false; status: 'verification_required'; provider: PaymentProvider; message: string;
};
export const PAYMENT_UNAVAILABLE = 'Online payment is unavailable until trusted backend verification is deployed. No payment has been initiated.';
export const PAYMENT_REVIEW_REQUIRED = 'Payment is not verified. This return page cannot establish whether money moved. Check your provider receipt and contact support; do not pay again based on this page.';
type Initiation = { paymentUrl: string; token: string };
async function unavailable(_request: PaymentRequest): Promise<Initiation> {
  throw new Error(PAYMENT_UNAVAILABLE);
}
// No browser secrets, provider calls, payment writes or redirect-trusted financial state.
// Restore initiation only through an approved backend with idempotent receipt verification.
export const paymentService = {
  async initiatePayment(request: PaymentRequest): Promise<Initiation> {
    if (request.provider !== 'khalti' && request.provider !== 'esewa') throw new Error('Unsupported payment provider');
    return unavailable(request);
  },
  initiateKhalti: unavailable,
  initiateEsewa: unavailable,
  async verifyPayment(provider: PaymentProvider, _untrustedReference: string): Promise<PaymentVerification> {
    return { success: false, status: 'verification_required', provider, message: PAYMENT_REVIEW_REQUIRED };
  },
};
