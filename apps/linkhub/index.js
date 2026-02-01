/**
 * LinkHub App - Link-in-bio tool
 * This is the main/original app
 */

const express = require('express');
const router = express.Router();

// This app's routes are already in /routes/
// This file just registers it as a hub app

router.get('/status', (req, res) => {
  res.json({
    app: 'LinkHub',
    status: 'active',
    description: 'Free link-in-bio tool for creators',
    features: [
      'Unlimited links',
      'Click analytics',
      'Custom themes',
      'No branding (Pro)',
    ],
  });
});

module.exports = {
  name: 'LinkHub',
  slug: 'linkhub',
  description: 'Free link-in-bio tool for creators',
  version: '1.0.0',
  routes: router,
  basePath: '/api/hub/linkhub',
};
