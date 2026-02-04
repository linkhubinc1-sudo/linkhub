/**
 * LinkHub Automation Configuration
 * All your API keys and settings in one place
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

module.exports = {
  // Your details
  email: process.env.ADMIN_EMAIL || 'linkhubinc1@gmail.com',

  // Twitter/X API (get from developer.twitter.com)
  twitter: {
    apiKey: process.env.TWITTER_API_KEY || '',
    apiSecret: process.env.TWITTER_API_SECRET || '',
    accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET || '',
    bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
  },

  // Stripe (you already have this)
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },

  // Gmail SMTP for sending reports
  email_smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    user: process.env.ADMIN_EMAIL || 'linkhubinc1@gmail.com',
    pass: process.env.GMAIL_APP_PASSWORD || '', // App password, not regular password
  },

  // Your app
  app: {
    name: 'LinkHub',
    url: process.env.APP_URL || 'https://linkhub-production-4cad.up.railway.app',
    adminEmail: process.env.ADMIN_EMAIL || 'linkhubinc1@gmail.com',
  },

  // Posting schedule (24h format, EST)
  schedule: {
    tweet1: '09:00',
    tweet2: '14:00',
    dailyReport: '08:00',
    weeklyReport: 'sunday 09:00',
  }
};
