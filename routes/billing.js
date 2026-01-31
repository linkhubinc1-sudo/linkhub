const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Initialize Stripe (will be null if not configured)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_xxx', // $5/month
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY || 'price_xxx',   // $48/year (save 20%)
};

// Get billing status
router.get('/status', authenticateToken, (req, res) => {
  const user = db.prepare(
    'SELECT plan, plan_expires_at, stripe_subscription_id FROM users WHERE id = ?'
  ).get(req.user.id);

  const isPro = user.plan === 'pro' &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  res.json({
    plan: isPro ? 'pro' : 'free',
    expiresAt: user.plan_expires_at,
    hasSubscription: !!user.stripe_subscription_id
  });
});

// Create checkout session
router.post('/checkout', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Payments not configured. Set STRIPE_SECRET_KEY in .env'
    });
  }

  try {
    const { priceType = 'monthly' } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);

    // Create or retrieve Stripe customer
    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id.toString(), username: user.username }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
        .run(customerId, user.id);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price: priceType === 'yearly' ? PRICES.pro_yearly : PRICES.pro_monthly,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?upgraded=true`,
      cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/pricing`,
      metadata: { userId: user.id.toString() }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Create billing portal session (for managing subscription)
router.post('/portal', authenticateToken, async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Payments not configured' });
  }

  try {
    const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?')
      .get(req.user.id);

    if (!user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Portal error:', err);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Stripe webhook handler
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    return res.status(503).send('Payments not configured');
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      // For testing without webhook signature verification
      event = JSON.parse(req.body);
    }
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata?.userId;
      if (userId) {
        db.prepare(`
          UPDATE users
          SET plan = 'pro', stripe_subscription_id = ?
          WHERE id = ?
        `).run(session.subscription, userId);
        console.log(`User ${userId} upgraded to Pro!`);
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.userId;

      if (userId) {
        if (subscription.status === 'active') {
          db.prepare(`
            UPDATE users SET plan = 'pro', plan_expires_at = NULL WHERE id = ?
          `).run(userId);
        } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
          // Set expiration to end of current period
          const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();
          db.prepare(`
            UPDATE users SET plan_expires_at = ? WHERE id = ?
          `).run(expiresAt, userId);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const customer = await stripe.customers.retrieve(subscription.customer);
      const userId = customer.metadata?.userId;

      if (userId) {
        db.prepare(`
          UPDATE users
          SET plan = 'free', stripe_subscription_id = NULL, plan_expires_at = NULL
          WHERE id = ?
        `).run(userId);
        console.log(`User ${userId} downgraded to Free`);
      }
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

module.exports = router;
