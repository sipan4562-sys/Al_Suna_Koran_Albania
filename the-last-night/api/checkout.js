// Stripe-Checkout für den Einmalkauf (kein Abo) erstellen.
import { send, readBody, verifyGoogle, hasPurchased, stripe, originOf, configured, handle, httpError, PRICE_CENTS, PRODUCT } from './_lib.js';

export default handle(async (req, res) => {
  if (req.method !== 'POST') throw httpError(405, 'Nur POST.');
  if (!configured()) throw httpError(503, 'Shop ist nicht eingerichtet.');
  const { idToken, consent } = await readBody(req);
  const user = await verifyGoogle(idToken);
  if (!consent) throw httpError(400, 'Bitte der sofortigen Freischaltung zustimmen.');
  if (await hasPurchased(user.sub)) return send(res, 200, { premium: true });
  const origin = originOf(req);
  const session = await stripe('checkout/sessions', {
    method: 'POST',
    params: {
      mode: 'payment',
      locale: 'de',
      client_reference_id: user.sub,
      customer_email: user.email,
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
      metadata: { google_sub: user.sub, product: PRODUCT },
      payment_intent_data: { metadata: { google_sub: user.sub, product: PRODUCT }, description: 'THE LAST NIGHT Vollversion' },
      custom_text: {
        submit: { message: 'Digitale Inhalte: Du stimmst der sofortigen Freischaltung zu und weißt, dass dein Widerrufsrecht damit erlischt.' },
      },
      success_url: `${origin}/?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?purchase=cancel`,
    },
  });
  send(res, 200, { url: session.url });
});
