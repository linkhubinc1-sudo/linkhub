require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./database');
const authRoutes = require('./routes/auth');
const linksRoutes = require('./routes/links');
const pagesRoutes = require('./routes/pages');
const analyticsRoutes = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/analytics', analyticsRoutes);

// Public profile pages (must be last to catch /:username)
app.use('/', pagesRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🔗 LinkHub is running!                  ║
  ║                                           ║
  ║   Local:  http://localhost:${PORT}           ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
  `);
});
