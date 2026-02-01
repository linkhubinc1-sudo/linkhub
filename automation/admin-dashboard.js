/**
 * Admin Dashboard Route
 * Add this to your Express app for a web-based dashboard
 */

const express = require('express');
const { getRevenueStats } = require('./revenue-tracker');
const db = require('../database');

const router = express.Router();

// Simple auth check (use your real auth in production)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'linkhub-admin-2024';

function requireAdmin(req, res, next) {
  const auth = req.query.key || req.headers['x-admin-key'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Get dashboard data
router.get('/api/admin/dashboard', requireAdmin, async (req, res) => {
  try {
    const revenue = await getRevenueStats();

    // App stats
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get().count;
    const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;

    // Recent signups
    const recentUsers = db.prepare(`
      SELECT username, email, plan, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `).all();

    // Top pages by clicks
    const topPages = db.prepare(`
      SELECT u.username, COUNT(c.id) as clicks
      FROM users u
      LEFT JOIN links l ON l.user_id = u.id
      LEFT JOIN clicks c ON c.link_id = l.id
      GROUP BY u.id
      ORDER BY clicks DESC
      LIMIT 10
    `).all();

    res.json({
      revenue,
      app: {
        totalUsers,
        proUsers,
        totalLinks,
        conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) + '%' : '0%',
      },
      recentUsers: recentUsers.map(u => ({
        username: u.username,
        email: u.email,
        plan: u.plan,
        joinedAt: u.created_at,
      })),
      topPages,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Simple HTML dashboard
router.get('/admin', requireAdmin, async (req, res) => {
  const revenue = await getRevenueStats();

  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'pro'").get().count;
  const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>LinkHub Admin</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 20px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; }
    .card { background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .card h2 { font-size: 14px; color: #666; margin-bottom: 8px; text-transform: uppercase; }
    .card .value { font-size: 36px; font-weight: bold; color: #333; }
    .card .subtitle { font-size: 14px; color: #999; margin-top: 4px; }
    .section { margin-top: 40px; }
    .updated { text-align: center; color: #999; margin-top: 40px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 LinkHub Admin Dashboard</h1>

    <div class="grid">
      <div class="card">
        <h2>💰 MRR</h2>
        <div class="value">$${revenue.mrr || 0}</div>
        <div class="subtitle">Monthly Recurring Revenue</div>
      </div>

      <div class="card">
        <h2>📈 Active Subs</h2>
        <div class="value">${revenue.activeSubscriptions || 0}</div>
        <div class="subtitle">Paying customers</div>
      </div>

      <div class="card">
        <h2>👥 Total Users</h2>
        <div class="value">${totalUsers}</div>
        <div class="subtitle">${proUsers} pro (${totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : 0}%)</div>
      </div>

      <div class="card">
        <h2>🔗 Total Links</h2>
        <div class="value">${totalLinks}</div>
        <div class="subtitle">Created by users</div>
      </div>

      <div class="card">
        <h2>🆕 New Today</h2>
        <div class="value">${revenue.newCustomersToday || 0}</div>
        <div class="subtitle">New customers</div>
      </div>

      <div class="card">
        <h2>📅 New This Week</h2>
        <div class="value">${revenue.newCustomersWeek || 0}</div>
        <div class="subtitle">New customers</div>
      </div>
    </div>

    <p class="updated">Last updated: ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;

  res.send(html);
});

module.exports = router;
