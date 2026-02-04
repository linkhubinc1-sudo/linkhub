/**
 * Admin Dashboard - See all signups, revenue, and activity
 * Access at: /admin?key=YOUR_ADMIN_PASSWORD
 */

const express = require('express');
const db = require('../database');

const router = express.Router();

// Admin password - change this in your .env file
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'linkhub-admin-2024';

function requireAdmin(req, res, next) {
  const auth = req.query.key || req.headers['x-admin-key'];
  if (auth !== ADMIN_PASSWORD) {
    return res.status(401).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Admin Login</title>
      <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0f172a;color:#fff;}
      .box{background:#1e293b;padding:2rem;border-radius:1rem;text-align:center;}
      input{padding:0.75rem;border-radius:0.5rem;border:1px solid #334155;background:#0f172a;color:#fff;margin:1rem 0;width:250px;}
      button{background:linear-gradient(135deg,#6366f1,#ec4899);color:white;border:none;padding:0.75rem 2rem;border-radius:0.5rem;cursor:pointer;font-weight:600;}</style>
      </head>
      <body>
        <div class="box">
          <h2>Admin Dashboard</h2>
          <form method="GET">
            <input type="password" name="key" placeholder="Admin Password" autofocus>
            <br><button type="submit">Login</button>
          </form>
        </div>
      </body>
      </html>
    `);
  }
  next();
}

// API endpoint for dashboard data
router.get('/api/admin/dashboard', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan IN ('pro', 'lifetime')").get().count;
    const lifetimeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'lifetime'").get().count;
    const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;
    const totalClicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get().count;
    const totalViews = db.prepare('SELECT COUNT(*) as count FROM page_views').get().count;

    // Today's signups
    const todaySignups = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE date(created_at) = date('now')
    `).get().count;

    // This week's signups
    const weekSignups = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= date('now', '-7 days')
    `).get().count;

    // Recent signups
    const recentUsers = db.prepare(`
      SELECT id, username, email, plan, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 50
    `).all();

    // Signups by day (last 7 days)
    const signupsByDay = db.prepare(`
      SELECT date(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at >= date('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY date DESC
    `).all();

    res.json({
      stats: {
        totalUsers,
        proUsers,
        lifetimeUsers,
        totalLinks,
        totalClicks,
        totalViews,
        todaySignups,
        weekSignups,
        conversionRate: totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : '0',
      },
      recentUsers,
      signupsByDay,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Beautiful HTML dashboard
router.get('/admin', requireAdmin, (req, res) => {
  try {
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const proUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan IN ('pro', 'lifetime')").get().count;
    const lifetimeUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE plan = 'lifetime'").get().count;
    const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;
    const totalClicks = db.prepare('SELECT COUNT(*) as count FROM clicks').get().count;
    const totalViews = db.prepare('SELECT COUNT(*) as count FROM page_views').get().count;

    const todaySignups = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE date(created_at) = date('now')
    `).get().count;

    const weekSignups = db.prepare(`
      SELECT COUNT(*) as count FROM users
      WHERE created_at >= date('now', '-7 days')
    `).get().count;

    const recentUsers = db.prepare(`
      SELECT id, username, email, plan, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    const key = req.query.key;

    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkHub Admin Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', system-ui, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.5rem; }
    .subtitle { color: #94a3b8; margin-bottom: 2rem; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card {
      background: rgba(30, 41, 59, 0.6);
      backdrop-filter: blur(10px);
      border: 1px solid #334155;
      border-radius: 1rem;
      padding: 1.5rem;
    }
    .card h2 { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .card .value {
      font-size: 2rem;
      font-weight: 700;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .card .subtitle { font-size: 0.8125rem; color: #64748b; margin-top: 0.25rem; }
    .card.highlight { border-color: #22c55e; }
    .card.highlight .value { background: linear-gradient(135deg, #22c55e, #14b8a6); -webkit-background-clip: text; }

    .section { margin-top: 2rem; }
    .section h2 { font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; }

    .table-container {
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid #334155;
      border-radius: 1rem;
      overflow: hidden;
    }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #334155; }
    th { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(0,0,0,0.2); }
    tr:last-child td { border-bottom: none; }
    tr:hover { background: rgba(255,255,255,0.02); }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.free { background: #334155; color: #94a3b8; }
    .badge.pro { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
    .badge.lifetime { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .time { color: #64748b; font-size: 0.8125rem; }

    .refresh-btn {
      background: #334155;
      color: #f8fafc;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      font-size: 0.8125rem;
    }
    .refresh-btn:hover { background: #475569; }

    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2rem; }

    @media (max-width: 768px) {
      body { padding: 1rem; }
      .grid { grid-template-columns: repeat(2, 1fr); }
      .card .value { font-size: 1.5rem; }
      th, td { padding: 0.75rem 0.5rem; font-size: 0.8125rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1>LinkHub Admin</h1>
        <p class="subtitle">Real-time dashboard - Last updated: ${new Date().toLocaleString()}</p>
      </div>
      <button class="refresh-btn" onclick="location.reload()">Refresh</button>
    </div>

    <div class="grid">
      <div class="card highlight">
        <h2>New Today</h2>
        <div class="value">${todaySignups}</div>
        <div class="subtitle">signups</div>
      </div>
      <div class="card">
        <h2>This Week</h2>
        <div class="value">${weekSignups}</div>
        <div class="subtitle">signups</div>
      </div>
      <div class="card">
        <h2>Total Users</h2>
        <div class="value">${totalUsers}</div>
        <div class="subtitle">registered</div>
      </div>
      <div class="card">
        <h2>Pro Users</h2>
        <div class="value">${proUsers}</div>
        <div class="subtitle">${totalUsers > 0 ? ((proUsers / totalUsers) * 100).toFixed(1) : 0}% conversion</div>
      </div>
      <div class="card">
        <h2>Lifetime</h2>
        <div class="value">${lifetimeUsers}</div>
        <div class="subtitle">one-time purchases</div>
      </div>
      <div class="card">
        <h2>Total Links</h2>
        <div class="value">${totalLinks}</div>
        <div class="subtitle">created</div>
      </div>
      <div class="card">
        <h2>Page Views</h2>
        <div class="value">${totalViews}</div>
        <div class="subtitle">profile views</div>
      </div>
      <div class="card">
        <h2>Link Clicks</h2>
        <div class="value">${totalClicks}</div>
        <div class="subtitle">tracked</div>
      </div>
    </div>

    <div class="section">
      <h2>Recent Signups</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Signed Up</th>
            </tr>
          </thead>
          <tbody>
            ${recentUsers.length === 0 ? '<tr><td colspan="4" style="text-align:center;color:#64748b;">No users yet</td></tr>' :
              recentUsers.map(u => `
                <tr>
                  <td><strong>@${u.username}</strong></td>
                  <td>${u.email}</td>
                  <td><span class="badge ${u.plan || 'free'}">${u.plan || 'free'}</span></td>
                  <td class="time">${new Date(u.created_at).toLocaleString()}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>
    </div>

    <p style="text-align: center; color: #64748b; margin-top: 2rem; font-size: 0.8125rem;">
      Bookmark this page: <code style="background:#1e293b;padding:0.25rem 0.5rem;border-radius:0.25rem;">/admin?key=${key}</code>
    </p>
  </div>

  <script>
    // Auto-refresh every 30 seconds
    setTimeout(() => location.reload(), 30000);
  </script>
</body>
</html>
    `);
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

module.exports = router;
