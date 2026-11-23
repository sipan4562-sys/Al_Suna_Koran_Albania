// Öffentliche Konfiguration für den Client (keine Geheimnisse).
import { send, configured, PRICE_CENTS } from './_lib.js';

export default function handler(req, res) {
  send(res, 200, {
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    payments: configured(),
    priceCents: PRICE_CENTS,
    currency: 'EUR',
  });
}
