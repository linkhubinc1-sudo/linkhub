/**
 * Email Reporter
 * Sends daily and weekly reports to your inbox
 */

const nodemailer = require('nodemailer');
const config = require('./config');
const { getRevenueStats } = require('./revenue-tracker');
const db = require('../database');

// Create transporter
function getTransporter() {
  if (!config.email_smtp.pass) {
    return null;
  }

  return nodemailer.createTransport({
    host: config.email_smtp.host,
    port: config.email_smtp.port,
    secure: false,
    auth: {
      user: config.email_smtp.user,
      pass: config.email_smtp.pass,
    },
  });
}

async function getAppStats() {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    // Get user counts
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const newUsersToday = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
    ).get(startOfDay.toISOString()).count;
    const newUsersWeek = db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE created_at >= ?'
    ).get(startOfWeek.toISOString()).count;

    // Get link counts
    const totalLinks = db.prepare('SELECT COUNT(*) as count FROM links').get().count;

    // Get click counts
    const clicksToday = db.prepare(
      'SELECT COUNT(*) as count FROM clicks WHERE clicked_at >= ?'
    ).get(startOfDay.toISOString()).count;
    const clicksWeek = db.prepare(
      'SELECT COUNT(*) as count FROM clicks WHERE clicked_at >= ?'
    ).get(startOfWeek.toISOString()).count;

    // Pro users
    const proUsers = db.prepare(
      "SELECT COUNT(*) as count FROM users WHERE plan = 'pro'"
    ).get().count;

    return {
      totalUsers,
      newUsersToday,
      newUsersWeek,
      totalLinks,
      clicksToday,
      clicksWeek,
      proUsers,
    };
  } catch (error) {
    return {
      error: error.message,
      totalUsers: 0,
      newUsersToday: 0,
      newUsersWeek: 0,
      totalLinks: 0,
      clicksToday: 0,
      clicksWeek: 0,
      proUsers: 0,
    };
  }
}

async function sendDailyReport() {
  const transporter = getTransporter();
  const revenue = await getRevenueStats();
  const app = await getAppStats();
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h1 style="color: #333;">📊 LinkHub Daily Report</h1>
      <p style="color: #666;">${date}</p>

      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">💰 Revenue</h2>
        <table style="width: 100%;">
          <tr><td>MRR:</td><td style="text-align: right;"><strong>$${revenue.mrr || 0}</strong></td></tr>
          <tr><td>Active Subscriptions:</td><td style="text-align: right;"><strong>${revenue.activeSubscriptions || 0}</strong></td></tr>
          <tr><td>New Customers Today:</td><td style="text-align: right;"><strong>${revenue.newCustomersToday || 0}</strong></td></tr>
        </table>
      </div>

      <div style="background: #e8f4f8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">👥 Users</h2>
        <table style="width: 100%;">
          <tr><td>Total Users:</td><td style="text-align: right;"><strong>${app.totalUsers}</strong></td></tr>
          <tr><td>New Today:</td><td style="text-align: right;"><strong>${app.newUsersToday}</strong></td></tr>
          <tr><td>Pro Users:</td><td style="text-align: right;"><strong>${app.proUsers}</strong></td></tr>
        </table>
      </div>

      <div style="background: #f0f8e8; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h2 style="margin-top: 0;">📈 Activity</h2>
        <table style="width: 100%;">
          <tr><td>Total Links:</td><td style="text-align: right;"><strong>${app.totalLinks}</strong></td></tr>
          <tr><td>Clicks Today:</td><td style="text-align: right;"><strong>${app.clicksToday}</strong></td></tr>
          <tr><td>Clicks This Week:</td><td style="text-align: right;"><strong>${app.clicksWeek}</strong></td></tr>
        </table>
      </div>

      <p style="color: #999; font-size: 12px; text-align: center;">
        Sent automatically by LinkHub Autopilot
      </p>
    </div>
  `;

  const text = `
LINKHUB DAILY REPORT - ${date}

💰 REVENUE
  MRR: $${revenue.mrr || 0}
  Active Subscriptions: ${revenue.activeSubscriptions || 0}
  New Customers Today: ${revenue.newCustomersToday || 0}

👥 USERS
  Total Users: ${app.totalUsers}
  New Today: ${app.newUsersToday}
  Pro Users: ${app.proUsers}

📈 ACTIVITY
  Total Links: ${app.totalLinks}
  Clicks Today: ${app.clicksToday}
  Clicks This Week: ${app.clicksWeek}
  `;

  if (!transporter) {
    console.log('📧 Email not configured. Would have sent:\n');
    console.log(text);
    return { sent: false, preview: text };
  }

  try {
    await transporter.sendMail({
      from: `"LinkHub Autopilot" <${config.email_smtp.user}>`,
      to: config.app.adminEmail,
      subject: `📊 LinkHub Daily Report - ${date}`,
      text: text,
      html: html,
    });

    console.log(`✅ Daily report sent to ${config.app.adminEmail}`);
    return { sent: true };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return { sent: false, error: error.message };
  }
}

async function sendWeeklyReport() {
  const transporter = getTransporter();
  const revenue = await getRevenueStats();
  const app = await getAppStats();

  const text = `
╔══════════════════════════════════════════════════════════════╗
║                  LINKHUB WEEKLY REPORT                         ║
╚══════════════════════════════════════════════════════════════╝

💰 REVENUE
   MRR: $${revenue.mrr || 0}
   Revenue This Month: $${revenue.totalRevenueThisMonth || 0}
   Active Subscriptions: ${revenue.activeSubscriptions || 0}
   New Customers This Week: ${revenue.newCustomersWeek || 0}
   Churned This Month: ${revenue.churnedThisMonth || 0}

👥 USERS
   Total Users: ${app.totalUsers}
   New This Week: ${app.newUsersWeek}
   Pro Users: ${app.proUsers}

📈 ACTIVITY
   Total Links: ${app.totalLinks}
   Clicks This Week: ${app.clicksWeek}

═══════════════════════════════════════════════════════════════
Generated: ${new Date().toLocaleString()}
  `;

  if (!transporter) {
    console.log('📧 Email not configured. Would have sent:\n');
    console.log(text);
    return { sent: false, preview: text };
  }

  try {
    await transporter.sendMail({
      from: `"LinkHub Autopilot" <${config.email_smtp.user}>`,
      to: config.app.adminEmail,
      subject: `📊 LinkHub Weekly Report`,
      text: text,
    });

    console.log(`✅ Weekly report sent to ${config.app.adminEmail}`);
    return { sent: true };
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    return { sent: false, error: error.message };
  }
}

module.exports = { sendDailyReport, sendWeeklyReport };

// Run directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--weekly')) {
    sendWeeklyReport();
  } else {
    sendDailyReport();
  }
}
