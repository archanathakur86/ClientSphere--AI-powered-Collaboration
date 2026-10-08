import Stripe from "stripe";

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" }) : null;

export const hasStripe = () => Boolean(stripe);

export const createStripeCheckout = async ({ invoice, successUrl, cancelUrl }) => {
  if (!stripe) throw new Error("Stripe is not configured");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        price_data: {
          currency: (invoice.currency || "usd").toLowerCase(),
          product_data: { name: `Invoice ${invoice.invoiceNumber || invoice._id.toString()}` },
          unit_amount: Math.round(Number(invoice.amount || 0) * 100),
        },
        quantity: 1,
      },
    ],
    metadata: {
      invoiceId: invoice._id.toString(),
      projectId: invoice.project.toString(),
    },
  });

  return session;
};

export const verifyStripeWebhook = (payload, signature) => {
  if (!stripe) throw new Error("Stripe is not configured");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook secret missing");
  return stripe.webhooks.constructEvent(payload, signature, secret);
};
