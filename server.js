require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { initDB } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Start server after DB is ready
async function startServer() {
  await initDB();

  const authRoutes = require('./routes/auth');
  const linksRoutes = require('./routes/links');
  const pagesRoutes = require('./routes/pages');
  const analyticsRoutes = require('./routes/analytics');
  const billingRoutes = require('./routes/billing');
  const referralRoutes = require('./routes/referral');
  const adminDashboard = require('./automation/admin-dashboard');

// Stripe webhook needs raw body - must be before express.json()
app.use('/api/billing/webhook', express.raw({ type: 'application/json' }));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/referral', referralRoutes);
app.use('/', adminDashboard);

// Public profile pages (must be last to catch /:username)
app.use('/', pagesRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`LinkHub running on port ${PORT}`);
  });
}

startServer().catch(console.error);
