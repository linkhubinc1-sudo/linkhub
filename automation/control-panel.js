#!/usr/bin/env node
/**
 * LinkHub Control Panel
 * One panel to control everything
 *
 * Run: node control-panel.js
 * Open: http://localhost:3001
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('./config');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'panel-public')));

// State
let schedulerProcess = null;
let automationStatus = {
  scheduler: 'stopped',
  lastTweet: null,
  lastDM: null,
  leadsFound: 0,
  dmsSent: 0,
  tweetsPosted: 0,
};

// Get leads data
function getLeadsData() {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'leads.json'), 'utf8'));
    return data;
  } catch {
    return { found: [], contacted: [], converted: [] };
  }
}

// Get DM log
function getDMLog() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'dm-log.json'), 'utf8'));
  } catch {
    return { sent: [], failed: [], dailyCount: 0 };
  }
}

// API Routes
app.get('/api/status', (req, res) => {
  const leads = getLeadsData();
  const dmLog = getDMLog();

  res.json({
    scheduler: automationStatus.scheduler,
    stats: {
      leadsFound: leads.found.length,
      leadsContacted: leads.contacted.length,
      leadsConverted: leads.converted.length,
      dmsSentToday: dmLog.dailyCount,
      totalDMsSent: dmLog.sent?.length || 0,
    },
    lastActions: {
      tweet: automationStatus.lastTweet,
      dm: automationStatus.lastDM,
    },
    config: {
      twitterConfigured: !!config.twitter.apiKey,
      emailConfigured: !!config.email_smtp.pass,
      stripeConfigured: !!config.stripe.secretKey,
    },
  });
});

app.get('/api/leads', (req, res) => {
  const leads = getLeadsData();
  res.json(leads);
});

app.post('/api/action/tweet', async (req, res) => {
  const { postTweet } = require('./twitter-browser');
  const { getNextTweet } = require('./twitter-bot');
  const text = req.body.text || getNextTweet();
  const result = await postTweet(text);
  if (result && result.success) {
    automationStatus.lastTweet = new Date().toISOString();
    automationStatus.tweetsPosted++;
    res.json({ success: true, tweet: text });
  } else {
    res.json({ success: false, error: result?.error || 'Failed to post tweet' });
  }
});

app.post('/api/twitter/login', async (req, res) => {
  const { loginManually } = require('./twitter-browser');
  loginManually();
  res.json({ status: 'Browser opened. Log in to Twitter, then close the browser.' });
});

app.post('/api/action/dm', async (req, res) => {
  const { runAutoDM } = require('./auto-dm');
  const { username } = req.body;
  // For single DM, we'll use the auto-dm in test mode
  try {
    await runAutoDM({ count: 1, testUser: username, dryRun: false });
    automationStatus.lastDM = new Date().toISOString();
    automationStatus.dmsSent++;
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.post('/api/action/find-leads', async (req, res) => {
  const { findLeads } = require('./lead-finder');
  const count = req.body.count || 20;
  const niche = req.body.niche || null;
  const leads = await findLeads({ count, niche });
  automationStatus.leadsFound += leads.length;
  res.json({ leads, count: leads.length });
});

app.post('/api/action/send-dms', async (req, res) => {
  const { runAutoDM } = require('./auto-dm');
  const count = req.body.count || 10;
  try {
    await runAutoDM({ count, dryRun: false });
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Preview next tweet
app.get('/api/preview-tweet', (req, res) => {
  const { getNextTweet } = require('./twitter-bot');
  res.json({ tweet: getNextTweet() });
});

// Serve control panel HTML
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkHub Control Panel</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f0f0f;
      color: #fff;
      min-height: 100vh;
      padding: 20px;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 30px; display: flex; align-items: center; gap: 10px; }
    h1 span { font-size: 14px; padding: 4px 12px; border-radius: 20px; }
    .running { background: #22c55e; }
    .stopped { background: #ef4444; }

    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }

    .card {
      background: #1a1a1a;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #333;
    }
    .card h2 { font-size: 14px; color: #888; margin-bottom: 15px; text-transform: uppercase; }
    .card .value { font-size: 36px; font-weight: bold; }
    .card .subtitle { color: #666; font-size: 14px; margin-top: 5px; }

    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 30px; }
    button {
      background: #3b82f6;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    button:hover { background: #2563eb; }
    button.danger { background: #ef4444; }
    button.danger:hover { background: #dc2626; }
    button.success { background: #22c55e; }
    button.success:hover { background: #16a34a; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }

    .leads-table {
      width: 100%;
      border-collapse: collapse;
    }
    .leads-table th, .leads-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #333;
    }
    .leads-table th { color: #888; font-weight: normal; font-size: 12px; text-transform: uppercase; }
    .leads-table a { color: #3b82f6; text-decoration: none; }
    .leads-table a:hover { text-decoration: underline; }

    .config-status { display: flex; gap: 20px; margin-bottom: 30px; }
    .config-item { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .config-item .dot { width: 8px; height: 8px; border-radius: 50%; }
    .config-item .dot.ok { background: #22c55e; }
    .config-item .dot.missing { background: #ef4444; }

    .log { background: #0a0a0a; border-radius: 8px; padding: 15px; font-family: monospace; font-size: 12px; max-height: 200px; overflow-y: auto; }
    .log-entry { padding: 4px 0; border-bottom: 1px solid #222; }

    .modal {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.8);
      justify-content: center;
      align-items: center;
      z-index: 100;
    }
    .modal.show { display: flex; }
    .modal-content {
      background: #1a1a1a;
      padding: 30px;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
    }
    .modal h3 { margin-bottom: 20px; }
    .modal input, .modal textarea {
      width: 100%;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #333;
      background: #0a0a0a;
      color: white;
      margin-bottom: 15px;
      font-size: 14px;
    }
    .modal textarea { min-height: 100px; resize: vertical; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎛️ LinkHub Control Panel</h1>

    <div class="config-status">
      <div class="config-item">
        <div class="dot" id="twitter-dot"></div>
        <span>Twitter</span>
      </div>
      <div class="config-item">
        <div class="dot" id="email-dot"></div>
        <span>Email</span>
      </div>
      <div class="config-item">
        <div class="dot" id="stripe-dot"></div>
        <span>Stripe</span>
      </div>
    </div>

    <div class="actions">
      <button onclick="twitterLogin()" class="danger">🔐 Login to X (First Time)</button>
      <button onclick="postAutoTweet()" class="success">🐦 Post Tweet</button>
      <button onclick="findLeads()">🔍 Find 20 Leads</button>
      <button onclick="sendBulkDMs()">📨 Send 10 DMs</button>
      <button onclick="openTweetModal()">✏️ Custom Tweet</button>
      <button onclick="openDMModal()">💬 Single DM</button>
    </div>

    <div class="grid">
      <div class="card">
        <h2>📊 Leads Found</h2>
        <div class="value" id="leads-found">0</div>
        <div class="subtitle">Ready to contact</div>
      </div>
      <div class="card">
        <h2>📨 DMs Sent Today</h2>
        <div class="value" id="dms-today">0</div>
        <div class="subtitle">/ 50 daily limit</div>
      </div>
      <div class="card">
        <h2>✅ Contacted</h2>
        <div class="value" id="leads-contacted">0</div>
        <div class="subtitle">Awaiting response</div>
      </div>
      <div class="card">
        <h2>🎉 Converted</h2>
        <div class="value" id="leads-converted">0</div>
        <div class="subtitle">Signed up</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 30px;">
      <h2>📋 Leads Queue</h2>
      <table class="leads-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>Followers</th>
            <th>Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody id="leads-tbody">
          <tr><td colspan="4" style="color: #666;">Loading...</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>📜 Activity Log</h2>
      <div class="log" id="activity-log">
        <div class="log-entry">Waiting for activity...</div>
      </div>
    </div>
  </div>

  <!-- Tweet Modal -->
  <div class="modal" id="tweet-modal">
    <div class="modal-content">
      <h3>🐦 Post Tweet</h3>
      <textarea id="tweet-text" placeholder="What's happening?"></textarea>
      <div class="modal-actions">
        <button onclick="closeTweetModal()" style="background: #333;">Cancel</button>
        <button onclick="sendTweet()">Post Tweet</button>
      </div>
    </div>
  </div>

  <!-- DM Modal -->
  <div class="modal" id="dm-modal">
    <div class="modal-content">
      <h3>📨 Send DM</h3>
      <input type="text" id="dm-username" placeholder="@username">
      <textarea id="dm-message" placeholder="Your message..."></textarea>
      <div class="modal-actions">
        <button onclick="closeDMModal()" style="background: #333;">Cancel</button>
        <button onclick="sendDMAction()">Send DM</button>
      </div>
    </div>
  </div>

  <script>
    let status = {};

    async function fetchStatus() {
      const res = await fetch('/api/status');
      status = await res.json();
      updateUI();
    }

    async function fetchLeads() {
      const res = await fetch('/api/leads');
      const data = await res.json();
      updateLeadsTable(data.found || []);
    }

    function updateUI() {
      document.getElementById('status-badge').textContent = status.scheduler === 'running' ? 'Running' : 'Stopped';
      document.getElementById('status-badge').className = status.scheduler === 'running' ? 'running' : 'stopped';

      document.getElementById('leads-found').textContent = status.stats?.leadsFound || 0;
      document.getElementById('leads-contacted').textContent = status.stats?.leadsContacted || 0;
      document.getElementById('leads-converted').textContent = status.stats?.leadsConverted || 0;
      document.getElementById('dms-today').textContent = status.stats?.dmsSentToday || 0;

      document.getElementById('twitter-dot').className = 'dot ' + (status.config?.twitterConfigured ? 'ok' : 'missing');
      document.getElementById('email-dot').className = 'dot ' + (status.config?.emailConfigured ? 'ok' : 'missing');
      document.getElementById('stripe-dot').className = 'dot ' + (status.config?.stripeConfigured ? 'ok' : 'missing');
    }

    function updateLeadsTable(leads) {
      const tbody = document.getElementById('leads-tbody');
      if (leads.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="color: #666;">No leads yet. Click "Find Leads" to start.</td></tr>';
        return;
      }
      tbody.innerHTML = leads.slice(0, 10).map(lead => \`
        <tr>
          <td><a href="https://twitter.com/\${lead.username}" target="_blank">@\${lead.username}</a></td>
          <td>\${lead.followers?.toLocaleString() || '?'}</td>
          <td>\${lead.leadType || 'unknown'}</td>
          <td><button onclick="dmLead('\${lead.username}')" style="padding: 6px 12px; font-size: 12px;">DM</button></td>
        </tr>
      \`).join('');
    }

    function addLog(message) {
      const log = document.getElementById('activity-log');
      const time = new Date().toLocaleTimeString();
      log.innerHTML = \`<div class="log-entry">[\${time}] \${message}</div>\` + log.innerHTML;
    }

    async function twitterLogin() {
      addLog('Opening browser for X login...');
      addLog('👉 Log in to X in the browser, then CLOSE the browser window');
      await fetch('/api/twitter/login', { method: 'POST' });
    }

    async function postAutoTweet() {
      addLog('Posting tweet...');
      const res = await fetch('/api/action/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (data.success) {
        addLog('✅ Tweet posted: ' + (data.tweet?.substring(0, 40) || '') + '...');
      } else {
        addLog('❌ Tweet failed: ' + (data.error || 'Unknown error'));
      }
      fetchStatus();
    }

    async function findLeads() {
      addLog('Searching for leads (this takes ~30 sec)...');
      const res = await fetch('/api/action/find-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 20 })
      });
      const data = await res.json();
      addLog(\`✅ Found \${data.count || 0} new leads\`);
      fetchLeads();
      fetchStatus();
    }

    async function sendBulkDMs() {
      addLog('Sending DMs to 10 leads (1 min between each)...');
      addLog('⏳ This will take ~10 minutes. Check back later.');
      const res = await fetch('/api/action/send-dms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 })
      });
      const data = await res.json();
      if (data.success) {
        addLog('✅ DM batch complete');
      } else {
        addLog('❌ DM batch failed: ' + (data.error || 'Unknown error'));
      }
      fetchLeads();
      fetchStatus();
    }

    function openTweetModal() {
      document.getElementById('tweet-modal').classList.add('show');
    }
    function closeTweetModal() {
      document.getElementById('tweet-modal').classList.remove('show');
    }

    function openDMModal() {
      document.getElementById('dm-modal').classList.add('show');
    }
    function closeDMModal() {
      document.getElementById('dm-modal').classList.remove('show');
    }

    function dmLead(username) {
      document.getElementById('dm-username').value = username;
      document.getElementById('dm-message').value = "Hey! Love your content. I built a free link-in-bio tool - way better than Linktree and completely free. Want to check it out?";
      openDMModal();
    }

    async function sendTweet() {
      const text = document.getElementById('tweet-text').value;
      if (!text) return;
      addLog('Posting tweet...');
      closeTweetModal();
      const res = await fetch('/api/action/tweet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        addLog('✅ Tweet posted!');
      } else {
        addLog('❌ Tweet failed: ' + data.error);
      }
      document.getElementById('tweet-text').value = '';
    }

    async function sendDMAction() {
      const username = document.getElementById('dm-username').value.replace('@', '');
      const message = document.getElementById('dm-message').value;
      if (!username || !message) return;
      addLog(\`Sending DM to @\${username}...\`);
      closeDMModal();
      const res = await fetch('/api/action/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, message })
      });
      const data = await res.json();
      if (data.success) {
        addLog(\`✅ DM sent to @\${username}\`);
      } else {
        addLog(\`❌ DM failed: \${data.error}\`);
      }
      fetchLeads();
      fetchStatus();
    }

    // Initial load
    fetchStatus();
    fetchLeads();

    // Auto-refresh
    setInterval(fetchStatus, 10000);
    setInterval(fetchLeads, 30000);
  </script>
</body>
</html>
  `);
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              LINKHUB CONTROL PANEL                             ║
╚══════════════════════════════════════════════════════════════╝

  Open: http://localhost:${PORT}

  First time setup:
  1. Click "Twitter Login" button
  2. Log into Twitter in the browser
  3. Close the browser
  4. Click "Start Automation"

╔══════════════════════════════════════════════════════════════╝
`);
});
