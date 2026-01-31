const express = require('express');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get analytics overview
router.get('/overview', authenticateToken, (req, res) => {
  const userId = req.user.id;

  // Total page views
  const pageViews = db.prepare(
    'SELECT COUNT(*) as total FROM page_views WHERE user_id = ?'
  ).get(userId);

  // Total clicks
  const clicks = db.prepare(`
    SELECT COUNT(*) as total FROM clicks c
    JOIN links l ON c.link_id = l.id
    WHERE l.user_id = ?
  `).get(userId);

  // Views last 7 days
  const viewsLast7Days = db.prepare(`
    SELECT DATE(viewed_at) as date, COUNT(*) as count
    FROM page_views
    WHERE user_id = ? AND viewed_at >= datetime('now', '-7 days')
    GROUP BY DATE(viewed_at)
    ORDER BY date ASC
  `).all(userId);

  // Clicks last 7 days
  const clicksLast7Days = db.prepare(`
    SELECT DATE(c.clicked_at) as date, COUNT(*) as count
    FROM clicks c
    JOIN links l ON c.link_id = l.id
    WHERE l.user_id = ? AND c.clicked_at >= datetime('now', '-7 days')
    GROUP BY DATE(c.clicked_at)
    ORDER BY date ASC
  `).all(userId);

  // Top links
  const topLinks = db.prepare(`
    SELECT l.id, l.title, l.url, COUNT(c.id) as clicks
    FROM links l
    LEFT JOIN clicks c ON l.id = c.link_id
    WHERE l.user_id = ?
    GROUP BY l.id
    ORDER BY clicks DESC
    LIMIT 5
  `).all(userId);

  res.json({
    totalViews: pageViews.total,
    totalClicks: clicks.total,
    viewsLast7Days,
    clicksLast7Days,
    topLinks
  });
});

// Track link click (public endpoint)
router.post('/click/:linkId', (req, res) => {
  const { linkId } = req.params;
  const userAgent = req.headers['user-agent'] || null;
  const referer = req.headers.referer || null;

  // Verify link exists
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(linkId);
  if (!link) {
    return res.status(404).json({ error: 'Link not found' });
  }

  db.prepare(
    'INSERT INTO clicks (link_id, user_agent, referer) VALUES (?, ?, ?)'
  ).run(linkId, userAgent, referer);

  res.json({ success: true });
});

module.exports = router;
