// Öffentliche Konfiguration für den Client (keine Geheimnisse).
import { send, accountsReady, paymentsReady, PRICE_CENTS } from './_lib.js';

export default function handler(req, res) {
  send(res, 200, { accounts: accountsReady(), payments: paymentsReady(), priceCents: PRICE_CENTS, currency: 'EUR' });
}
