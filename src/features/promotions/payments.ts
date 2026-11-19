import "server-only";

/**
 * Payment-provider boundary. No provider is wired yet: Stripe is not assumed to be available
 * for an Albanian business. Implement this interface for the chosen provider (e.g. a local
 * bank gateway or Paysera), register it in `paymentProvider()`, and the UI will start
 * offering checkout. Until then no "Pay" button is rendered anywhere.
 */
export interface PaymentProvider {
  readonly name: string;
  createCheckout(input: { paymentId: string; amountMinor: number; currency: "EUR" | "ALL"; description: string; returnUrl: string }): Promise<{ redirectUrl: string; providerRef: string }>;
  /** Verify signature and return a normalised event, or null when the request is not authentic. */
  verifyWebhook(req: Request): Promise<{ providerRef: string; status: "SUCCEEDED" | "FAILED" | "REFUNDED"; raw: unknown } | null>;
}

export function paymentProvider(): PaymentProvider | null {
  return null;
}

export function paymentsEnabled(): boolean {
  return paymentProvider() !== null;
}
