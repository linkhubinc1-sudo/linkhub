/**
 * Revenue Tracker
 * Pulls data from Stripe and generates financial reports
 */

const config = require('./config');

let stripe = null;
if (config.stripe.secretKey) {
  stripe = require('stripe')(config.stripe.secretKey);
}

async function getRevenueStats() {
  if (!stripe) {
    return {
      error: 'Stripe not configured',
      mrr: 0,
      totalRevenue: 0,
      activeSubscriptions: 0,
      newCustomersToday: 0,
      newCustomersWeek: 0,
      churnedThisMonth: 0,
    };
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  try {
    // Get active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    });

    // Calculate MRR
    let mrr = 0;
    subscriptions.data.forEach(sub => {
      sub.items.data.forEach(item => {
        const amount = item.price.unit_amount / 100;
        const interval = item.price.recurring?.interval;
        if (interval === 'month') {
          mrr += amount;
        } else if (interval === 'year') {
          mrr += amount / 12;
        }
      });
    });

    // Get recent charges for total revenue
    const charges = await stripe.charges.list({
      created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
      limit: 100,
    });

    const monthlyRevenue = charges.data
      .filter(c => c.status === 'succeeded')
      .reduce((sum, c) => sum + c.amount / 100, 0);

    // Get new customers
    const customersToday = await stripe.customers.list({
      created: { gte: Math.floor(startOfDay.getTime() / 1000) },
      limit: 100,
    });

    const customersWeek = await stripe.customers.list({
      created: { gte: Math.floor(startOfWeek.getTime() / 1000) },
      limit: 100,
    });

    // Get churned subscriptions this month
    const canceledSubs = await stripe.subscriptions.list({
      status: 'canceled',
      created: { gte: Math.floor(startOfMonth.getTime() / 1000) },
      limit: 100,
    });

    return {
      mrr: mrr.toFixed(2),
      totalRevenueThisMonth: monthlyRevenue.toFixed(2),
      activeSubscriptions: subscriptions.data.length,
      newCustomersToday: customersToday.data.length,
      newCustomersWeek: customersWeek.data.length,
      churnedThisMonth: canceledSubs.data.length,
      asOf: now.toISOString(),
    };
  } catch (error) {
    console.error('Stripe error:', error.message);
    return { error: error.message };
  }
}

async function generateRevenueReport() {
  const stats = await getRevenueStats();

  if (stats.error && stats.error !== 'Stripe not configured') {
    return `❌ Error generating report: ${stats.error}`;
  }

  return `
╔══════════════════════════════════════════════════════════════╗
║                    LINKHUB REVENUE REPORT                      ║
╚══════════════════════════════════════════════════════════════╝

📊 KEY METRICS
─────────────────────────────────────────────────────────────────
  Monthly Recurring Revenue (MRR):  $${stats.mrr}
  Revenue This Month:               $${stats.totalRevenueThisMonth}
  Active Subscriptions:             ${stats.activeSubscriptions}

📈 GROWTH
─────────────────────────────────────────────────────────────────
  New Customers Today:              ${stats.newCustomersToday}
  New Customers This Week:          ${stats.newCustomersWeek}
  Churned This Month:               ${stats.churnedThisMonth}

─────────────────────────────────────────────────────────────────
Generated: ${new Date().toLocaleString()}
`;
}

module.exports = { getRevenueStats, generateRevenueReport };

// Run directly
if (require.main === module) {
  generateRevenueReport().then(console.log);
}
