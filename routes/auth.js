const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate username (alphanumeric, 3-20 chars)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3-20 characters, letters, numbers, and underscores only'
      });
    }

    // Check if username or email exists
    const existing = db.prepare(
      'SELECT id FROM users WHERE username = ? OR email = ?'
    ).get(username.toLowerCase(), email.toLowerCase());

    if (existing) {
      return res.status(400).json({ error: 'Username or email already taken' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = db.prepare(
      'INSERT INTO users (username, email, password, display_name) VALUES (?, ?, ?, ?)'
    ).run(username.toLowerCase(), email.toLowerCase(), hashedPassword, username);

    const user = { id: result.lastInsertRowid, username: username.toLowerCase(), email: email.toLowerCase() };
    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Account created successfully!',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create account' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare(
      'SELECT * FROM users WHERE email = ?'
    ).get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      message: 'Logged in successfully!',
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', authenticateToken, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, email, display_name, bio, avatar_url, theme, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
});

// Update profile
router.put('/profile', authenticateToken, (req, res) => {
  const { display_name, bio, avatar_url, theme } = req.body;

  db.prepare(
    'UPDATE users SET display_name = ?, bio = ?, avatar_url = ?, theme = ? WHERE id = ?'
  ).run(display_name || null, bio || null, avatar_url || null, theme || 'default', req.user.id);

  res.json({ message: 'Profile updated successfully' });
});

module.exports = router;
