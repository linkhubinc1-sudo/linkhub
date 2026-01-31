const express = require('express');
const path = require('path');
const db = require('../database');

const router = express.Router();

// Serve main app pages
router.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

router.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

router.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/register.html'));
});

router.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/dashboard.html'));
});

// Public profile page - must be last!
router.get('/:username', (req, res) => {
  const { username } = req.params;

  // Check if user exists
  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar_url, theme FROM users WHERE username = ?'
  ).get(username.toLowerCase());

  if (!user) {
    return res.status(404).sendFile(path.join(__dirname, '../public/404.html'));
  }

  // Track page view
  const userAgent = req.headers['user-agent'] || null;
  const referer = req.headers.referer || null;

  db.prepare(
    'INSERT INTO page_views (user_id, user_agent, referer) VALUES (?, ?, ?)'
  ).run(user.id, userAgent, referer);

  // Serve profile page (the frontend will fetch data via API)
  res.sendFile(path.join(__dirname, '../public/profile.html'));
});

// API endpoint for public profile data
router.get('/api/profile/:username', (req, res) => {
  const { username } = req.params;

  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar_url, theme FROM users WHERE username = ?'
  ).get(username.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const links = db.prepare(
    'SELECT id, title, url, icon FROM links WHERE user_id = ? AND is_active = 1 ORDER BY position ASC'
  ).all(user.id);

  res.json({ user, links });
});

module.exports = router;
