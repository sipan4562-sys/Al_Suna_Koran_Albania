// Stripe-Checkout für den Einmalkauf (kein Abo) erstellen – gebunden an das eigene Konto.
import { send, readBody, handle, httpError, paymentsReady, requireUser, isPremium, stripe, originOf, PRICE_CENTS, PRODUCT } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!paymentsReady()) throw httpError(503, 'Der Kauf ist im Moment nicht verfügbar.');
  const { token, consent } = await readBody(req);
  const rec = await requireUser(token);
  if (!consent) throw httpError(400, 'Bitte der sofortigen Freischaltung zustimmen.');
  if (await isPremium(rec)) return send(res, 200, { premium: true });
  const origin = originOf(req);
  const session = await stripe('checkout/sessions', {
    method: 'POST',
    params: {
      mode: 'payment',
      locale: 'de',
      client_reference_id: rec.id,
      customer_email: rec.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: PRICE_CENTS,
            product_data: {
              name: 'THE LAST NIGHT – Vollversion',
              description: 'Einmalige Zahlung, kein Abo: Revolver, Kreuzkette, Gebet, langlebige Batterien.',
            },
          },
        },
      ],
      metadata: { user_id: rec.id, product: PRODUCT },
      payment_intent_data: { metadata: { user_id: rec.id, product: PRODUCT }, description: 'THE LAST NIGHT Vollversion' },
      custom_text: {
        submit: { message: 'Digitale Inhalte: Du stimmst der sofortigen Freischaltung zu und weißt, dass dein Widerrufsrecht damit erlischt.' },
      },
      success_url: `${origin}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?purchase=cancel`,
    },
  });
  send(res, 200, { url: session.url });
});
