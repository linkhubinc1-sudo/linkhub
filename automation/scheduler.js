#!/usr/bin/env node
/**
 * LinkHub Full Automation Scheduler
 * Runs everything automatically - zero manual work
 *
 * Usage:
 *   node scheduler.js          Start 24/7 scheduler
 *   node scheduler.js --once   Run full routine once
 *   node scheduler.js --status Show config status
 */

const cron = require('node-cron');
const config = require('./config');
const { postTweet, searchAndEngage } = require('./twitter-bot');
const { sendDailyReport, sendWeeklyReport } = require('./email-reporter');
const { findLeads, exportToCSV } = require('./lead-finder');
const { runAutoDM } = require('./auto-dm');
const { generateRevenueReport } = require('./revenue-tracker');
const nodemailer = require('nodemailer');

console.log(`
╔══════════════════════════════════════════════════════════════╗
║           LINKHUB FULL AUTOMATION SCHEDULER                    ║
║                   Zero Work Mode™                              ║
╚══════════════════════════════════════════════════════════════╝
`);

// Check configuration
function checkConfig() {
  const status = { ready: true, issues: [] };

  console.log('🔧 Configuration Status:\n');

  if (!config.twitter.apiKey) {
    status.issues.push('Twitter API - auto-posting disabled');
    console.log('   ❌ Twitter API');
  } else {
    console.log('   ✅ Twitter API');
  }

  if (!config.twitter.accessToken) {
    status.issues.push('Twitter Access Token - DMs disabled');
    console.log('   ❌ Twitter DM Access');
  } else {
    console.log('   ✅ Twitter DM Access');
  }

  if (!config.stripe.secretKey) {
    status.issues.push('Stripe - revenue tracking disabled');
    console.log('   ❌ Stripe');
  } else {
    console.log('   ✅ Stripe');
  }

  if (!config.email_smtp.pass) {
    status.issues.push('Email - reports console only');
    console.log('   ❌ Email (Gmail)');
  } else {
    console.log('   ✅ Email (Gmail)');
  }

  if (status.issues.length > 0) {
    console.log('\n⚠️  Missing config (see GET_API_KEYS.md):');
    status.issues.forEach(i => console.log(`   • ${i}`));
    status.ready = false;
  }

  console.log('');
  return status;
}

// Send leads email
async function sendLeadsEmail(leads) {
  if (!config.email_smtp.pass || leads.length === 0) return;

  const transporter = nodemailer.createTransport({
    host: config.email_smtp.host,
    port: config.email_smtp.port,
    secure: false,
    auth: {
      user: config.email_smtp.user,
      pass: config.email_smtp.pass,
    },
  });

  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px;">
      <h1>🎯 Today's Lead List - ${leads.length} people to DM</h1>
      <p style="color: #666;">These DMs will be sent automatically. Just check back for conversions.</p>
      <hr>
  `;

  leads.slice(0, 10).forEach((lead, i) => {
    html += `
      <div style="padding: 15px; background: #f5f5f5; margin: 10px 0; border-radius: 8px;">
        <strong>#${i + 1} <a href="https://twitter.com/${lead.username}">@${lead.username}</a></strong>
        (${lead.followers?.toLocaleString() || '?'} followers)<br>
        <span style="color: #666;">${lead.bio?.substring(0, 100) || 'No bio'}...</span>
      </div>
    `;
  });

  if (leads.length > 10) {
    html += `<p>...and ${leads.length - 10} more</p>`;
  }

  html += '</div>';

  await transporter.sendMail({
    from: `"LinkHub Autopilot" <${config.email_smtp.user}>`,
    to: config.app.adminEmail,
    subject: `🎯 ${leads.length} Leads Found - Auto-DMing now`,
    html,
  });
}

// Morning routine (8 AM)
async function morningRoutine() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🌅 MORNING ROUTINE - ${new Date().toLocaleString()}`);
  console.log('═'.repeat(60));

  // 1. Find leads
  console.log('\n📍 Step 1: Finding leads...');
  const leads = await findLeads({ count: 30 });
  console.log(`   Found ${leads.length} new leads`);

  if (leads.length > 0) {
    // 2. Export to CSV
    console.log('\n📁 Step 2: Exporting leads...');
    exportToCSV(leads);

    // 3. Email the list
    console.log('\n📧 Step 3: Emailing lead list...');
    await sendLeadsEmail(leads);

    // 4. Start auto-DM (runs in background)
    console.log('\n📨 Step 4: Starting auto-DM...');
    await runAutoDM({ count: 15 });
  }

  // 5. Send daily report
  console.log('\n📊 Step 5: Sending daily report...');
  await sendDailyReport();

  console.log('\n✅ Morning routine complete!');
}

// Tweet routine
async function tweetRoutine() {
  console.log(`\n🐦 Posting tweet... (${new Date().toLocaleTimeString()})`);
  await postTweet();
}

// Afternoon DM session (3 PM)
async function afternoonDMs() {
  console.log(`\n📨 AFTERNOON DM SESSION - ${new Date().toLocaleString()}`);
  await runAutoDM({ count: 10 });
}

// Engagement routine (searches for people to reply to)
async function engagementRoutine() {
  console.log(`\n🔍 Searching for engagement... (${new Date().toLocaleTimeString()})`);
  await searchAndEngage();
}

// Full routine (for --once flag)
async function runFullRoutine() {
  console.log('Running full routine once...\n');

  await morningRoutine();
  await tweetRoutine();

  console.log(`\n${'═'.repeat(60)}`);
  console.log('✅ FULL ROUTINE COMPLETE');
  console.log('═'.repeat(60));
}

// Main
const args = process.argv.slice(2);
const status = checkConfig();

if (args.includes('--once')) {
  runFullRoutine().then(() => {
    console.log('\nExiting.');
    process.exit(0);
  });

} else if (args.includes('--status')) {
  console.log('📅 Schedule (all times local):');
  console.log('   8:00 AM  - Morning routine (find leads, auto-DM, report)');
  console.log('   9:00 AM  - Tweet #1');
  console.log('   10:00 AM - Engagement search');
  console.log('   2:00 PM  - Tweet #2');
  console.log('   3:00 PM  - Afternoon DM session');
  console.log('   6:00 PM  - Engagement search');
  console.log('   Sunday   - Weekly report');

} else {
  // Run as 24/7 scheduler
  console.log('📅 Starting 24/7 scheduler...\n');
  console.log('Schedule:');
  console.log('   8:00 AM  - Morning routine');
  console.log('   9:00 AM  - Tweet');
  console.log('   10:00 AM - Engagement');
  console.log('   2:00 PM  - Tweet');
  console.log('   3:00 PM  - Afternoon DMs');
  console.log('   6:00 PM  - Engagement');
  console.log('   Sunday   - Weekly report\n');

  // Morning routine (8 AM)
  cron.schedule('0 8 * * *', morningRoutine);

  // Morning tweet (9 AM)
  cron.schedule('0 9 * * *', tweetRoutine);

  // Morning engagement (10 AM)
  cron.schedule('0 10 * * *', engagementRoutine);

  // Afternoon tweet (2 PM)
  cron.schedule('0 14 * * *', tweetRoutine);

  // Afternoon DMs (3 PM)
  cron.schedule('0 15 * * *', afternoonDMs);

  // Evening engagement (6 PM)
  cron.schedule('0 18 * * *', engagementRoutine);

  // Weekly report (Sunday 9 AM)
  cron.schedule('0 9 * * 0', async () => {
    console.log('\n📊 Sending weekly report...');
    await sendWeeklyReport();
  });

  console.log('✅ Scheduler running. Will execute tasks automatically.');
  console.log('   Press Ctrl+C to stop.\n');

  process.on('SIGINT', () => {
    console.log('\n\nScheduler stopped.');
    process.exit(0);
  });
}
