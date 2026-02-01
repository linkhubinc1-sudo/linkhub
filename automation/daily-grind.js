#!/usr/bin/env node
/**
 * Daily Grind - Aggressive Daily Marketing Routine
 *
 * Run this once per day. It will:
 * 1. Find 30 new leads
 * 2. Post a tweet
 * 3. Generate your DM list
 * 4. Email you the list
 *
 * Usage: node daily-grind.js
 */

const { findLeads, generateOutreachList, exportToCSV } = require('./lead-finder');
const { postTweet } = require('./twitter-bot');
const { sendDailyReport } = require('./email-reporter');
const config = require('./config');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendLeadEmail(leads) {
  if (!config.email_smtp.pass) {
    console.log('📧 Email not configured - skipping lead email');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.email_smtp.host,
    port: config.email_smtp.port,
    secure: false,
    auth: {
      user: config.email_smtp.user,
      pass: config.email_smtp.pass,
    },
  });

  // Build HTML email
  let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h1 style="color: #333;">🎯 Today's Outreach List</h1>
      <p style="color: #666;">${new Date().toLocaleDateString()} - ${leads.length} new leads</p>
  `;

  leads.forEach((lead, i) => {
    html += `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin: 0 0 10px 0;">
          #${i + 1} <a href="${lead.profileUrl}" style="color: #1da1f2;">@${lead.username}</a>
          <span style="font-weight: normal; color: #666;">(${lead.followers.toLocaleString()} followers)</span>
        </h3>
        <p style="margin: 5px 0; color: #666; font-size: 14px;">${lead.bio || 'No bio'}</p>
        <p style="margin: 10px 0 5px 0; font-weight: bold; font-size: 12px; color: #999;">SUGGESTED DM:</p>
        <div style="background: white; padding: 10px; border-radius: 4px; border-left: 3px solid #1da1f2;">
          <p style="margin: 0;">"${lead.suggestedMessage.opener}</p>
          <p style="margin: 10px 0;">${lead.suggestedMessage.pitch}</p>
          <p style="margin: 0;">${lead.suggestedMessage.cta}"</p>
        </div>
      </div>
    `;
  });

  html += `
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #999; font-size: 12px;">
        💡 Pro tip: Personalize each message! Reference their content or bio.
      </p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"LinkHub Lead Finder" <${config.email_smtp.user}>`,
      to: config.app.adminEmail,
      subject: `🎯 ${leads.length} New Leads Ready to DM`,
      html: html,
    });
    console.log(`✅ Lead list emailed to ${config.app.adminEmail}`);
  } catch (error) {
    console.error('❌ Failed to send lead email:', error.message);
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                      DAILY GRIND                                   ║
║              Aggressive Marketing Routine                          ║
╚══════════════════════════════════════════════════════════════════╝
Time: ${new Date().toLocaleString()}
`);

  // Step 1: Post tweet
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 STEP 1: Posting tweet...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  await postTweet();

  // Step 2: Find leads
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎯 STEP 2: Finding leads...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const leads = await findLeads({ count: 30 });

  if (leads.length > 0) {
    // Step 3: Export to CSV
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📁 STEP 3: Exporting leads...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    exportToCSV(leads);

    // Step 4: Email the list
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 STEP 4: Emailing lead list...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    await sendLeadEmail(leads);

    // Step 5: Print outreach list
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 STEP 5: Your outreach list...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    generateOutreachList(leads);
  }

  // Summary
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                        DONE!                                       ║
╚══════════════════════════════════════════════════════════════════╝

✅ Tweet posted
✅ ${leads.length} leads found
✅ List exported to CSV
✅ List emailed to you

🎯 YOUR MISSION: DM these ${leads.length} people today.
   Expected conversions: ${Math.round(leads.length * 0.05)}-${Math.round(leads.length * 0.1)} signups (5-10% rate)

💡 Track your results:
   node lead-finder.js --contacted @username
   node lead-finder.js --converted @username
   node lead-finder.js --stats
`);
}

main().catch(console.error);
