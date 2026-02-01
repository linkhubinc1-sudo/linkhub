# LinkHub Apps

This folder contains pluggable apps for the LinkHub platform.

## How to Add a New App

1. Create a folder: `apps/your-app-name/`
2. Add these files:
   - `index.js` - Main app logic, exports Express router
   - `automation.js` - Automated tasks (optional)
   - `config.js` - App settings (optional)

3. Register in `apps/registry.js`

## Example App Structure

```
apps/
├── your-app-name/
│   ├── index.js        # Express routes
│   ├── automation.js   # Scheduled tasks
│   └── config.js       # Settings
└── registry.js         # App registry
```

## Current Apps

| App | Description | Status |
|-----|-------------|--------|
| linkhub | Link-in-bio tool | Active |
| (more coming) | | |

## Adding App Routes

In your app's `index.js`:

```javascript
const express = require('express');
const router = express.Router();

router.get('/your-endpoint', (req, res) => {
  res.json({ message: 'Hello from your app!' });
});

module.exports = {
  name: 'Your App Name',
  slug: 'your-app',
  routes: router,
  basePath: '/api/your-app',
};
```

## Adding Automation

In your app's `automation.js`:

```javascript
module.exports = {
  // Runs daily at 9am
  dailyTask: async () => {
    console.log('Running daily task...');
  },

  // Runs every hour
  hourlyTask: async () => {
    console.log('Running hourly task...');
  },
};
```
