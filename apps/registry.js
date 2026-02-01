/**
 * App Registry
 * Central place to register all apps in the hub
 */

const fs = require('fs');
const path = require('path');

// Manually registered apps
const apps = [];

// Auto-discover apps in this folder
function discoverApps() {
  const appsDir = __dirname;
  const discovered = [];

  const folders = fs.readdirSync(appsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const folder of folders) {
    const indexPath = path.join(appsDir, folder, 'index.js');
    if (fs.existsSync(indexPath)) {
      try {
        const app = require(indexPath);
        if (app.name && app.routes) {
          discovered.push({
            ...app,
            folder,
            path: indexPath,
          });
          console.log(`   ✓ Loaded app: ${app.name}`);
        }
      } catch (e) {
        console.log(`   ✗ Failed to load app: ${folder} - ${e.message}`);
      }
    }
  }

  return discovered;
}

// Get all apps (manual + discovered)
function getAllApps() {
  return [...apps, ...discoverApps()];
}

// Register apps with Express
function registerApps(expressApp) {
  console.log('\n📦 Loading apps...');
  const allApps = getAllApps();

  for (const app of allApps) {
    const basePath = app.basePath || `/api/${app.slug}`;
    expressApp.use(basePath, app.routes);
    console.log(`   → ${app.name} mounted at ${basePath}`);
  }

  console.log(`   Total: ${allApps.length} apps\n`);
  return allApps;
}

// Get automation tasks from all apps
function getAutomationTasks() {
  const tasks = [];
  const allApps = getAllApps();

  for (const app of allApps) {
    const automationPath = path.join(__dirname, app.folder, 'automation.js');
    if (fs.existsSync(automationPath)) {
      try {
        const automation = require(automationPath);
        tasks.push({
          app: app.name,
          tasks: automation,
        });
      } catch (e) {
        console.log(`Failed to load automation for ${app.name}: ${e.message}`);
      }
    }
  }

  return tasks;
}

module.exports = {
  apps,
  getAllApps,
  registerApps,
  getAutomationTasks,
  discoverApps,
};
