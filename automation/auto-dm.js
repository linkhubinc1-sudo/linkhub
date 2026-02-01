#!/usr/bin/env node
/**
 * Auto-DM System
 * Automatically sends personalized DMs to leads
 *
 * Usage:
 *   node auto-dm.js                    Send DMs to 10 leads
 *   node auto-dm.js --count 20         Send DMs to 20 leads
 *   node auto-dm.js --dry-run          Preview without sending
 *   node auto-dm.js --test @username   Test DM to specific user
 */

const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Rate limiting: Twitter allows ~500 DMs/day, but we go slow to avoid flags
const DELAY_BETWEEN_DMS = 60000; // 1 minute between DMs (safe)
const MAX_DMS_PER_RUN = 20;      // Max DMs per run

// Leads file
const leadsFile = path.join(__dirname, 'leads.json');
const dmLogFile = path.join(__dirname, 'dm-log.json');

function getLeads() {
  try {
    return JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
  } catch {
    return { found: [], contacted: [], converted: [] };
  }
}

function saveLeads(leads) {
  fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
}

function getDMLog() {
  try {
    return JSON.parse(fs.readFileSync(dmLogFile, 'utf8'));
  } catch {
    return { sent: [], failed: [], dailyCount: 0, lastReset: new Date().toDateString() };
  }
}

function saveDMLog(log) {
  fs.writeFileSync(dmLogFile, JSON.stringify(log, null, 2));
}

function generatePersonalizedMessage(lead) {
  const template = lead.suggestedMessage;
  const appUrl = config.app.url;

  // Build personalized message
  let message = template.opener + '\n\n' + template.pitch + '\n\n' + template.cta;

  // Add URL
  message += `\n\n${appUrl}`;

  // Personalization based on bio
  if (lead.bio) {
    const bio = lead.bio.toLowerCase();
    if (bio.includes('artist') || bio.includes('art')) {
      message = message.replace('Love your content!', 'Love your art!');
    } else if (bio.includes('music') || bio.includes('producer') || bio.includes('singer')) {
      message = message.replace('Love your content!', 'Love your music!');
    } else if (bio.includes('fitness') || bio.includes('coach')) {
      message = message.replace('Love your content!', 'Love what you\'re building!');
    } else if (bio.includes('business') || bio.includes('founder') || bio.includes('ceo')) {
      message = message.replace('Love your content!', 'Respect the hustle!');
    }
  }

  return message;
}

async function sendDM(client, userId, username, message) {
  try {
    // Twitter API v2 DM endpoint
    await client.v2.sendDmToParticipant(userId, {
      text: message,
    });
    return { success: true };
  } catch (error) {
    // Handle specific errors
    if (error.code === 349) {
      return { success: false, error: 'User has DMs disabled', skip: true };
    } else if (error.code === 150) {
      return { success: false, error: 'Cannot DM this user', skip: true };
    } else if (error.code === 88) {
      return { success: false, error: 'Rate limited', rateLimit: true };
    }
    return { success: false, error: error.message };
  }
}

async function runAutoDM(options = {}) {
  const { count = 10, dryRun = false, testUser = null } = options;

  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                      AUTO-DM SYSTEM                                ║
╚══════════════════════════════════════════════════════════════════╝
Mode: ${dryRun ? 'DRY RUN (no DMs will be sent)' : 'LIVE'}
Target: ${testUser ? `@${testUser}` : `${count} leads`}
`);

  // Check API config
  if (!config.twitter.apiKey || !config.twitter.accessToken) {
    console.log('❌ Twitter API not configured.');
    console.log('   Add these to .env:');
    console.log('   - TWITTER_API_KEY');
    console.log('   - TWITTER_API_SECRET');
    console.log('   - TWITTER_ACCESS_TOKEN');
    console.log('   - TWITTER_ACCESS_TOKEN_SECRET');
    console.log('\n   Note: You need "Read and Write and Direct Messages" permissions');
    console.log('   in your Twitter App settings.');
    return;
  }

  const client = new TwitterApi({
    appKey: config.twitter.apiKey,
    appSecret: config.twitter.apiSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessTokenSecret,
  });

  // Check daily limit
  const dmLog = getDMLog();
  const today = new Date().toDateString();
  if (dmLog.lastReset !== today) {
    dmLog.dailyCount = 0;
    dmLog.lastReset = today;
  }

  if (dmLog.dailyCount >= 50) {
    console.log('⚠️  Daily DM limit reached (50). Try again tomorrow.');
    console.log('   This is a safety limit to prevent account flags.');
    return;
  }

  const leads = getLeads();
  let leadsToContact = [];

  if (testUser) {
    // Test mode: find specific user or create test lead
    const existingLead = leads.found.find(l =>
      l.username.toLowerCase() === testUser.toLowerCase()
    );
    if (existingLead) {
      leadsToContact = [existingLead];
    } else {
      console.log(`Finding user @${testUser}...`);
      try {
        const user = await client.v2.userByUsername(testUser, {
          'user.fields': ['description', 'public_metrics'],
        });
        if (user.data) {
          leadsToContact = [{
            id: user.data.id,
            username: user.data.username,
            name: user.data.name,
            bio: user.data.description,
            followers: user.data.public_metrics?.followers_count || 0,
            leadType: 'creator_generic',
            suggestedMessage: {
              opener: "Hey!",
              pitch: "I built a free link-in-bio tool - better than Linktree, completely free.",
              cta: "Would you check it out?",
            },
          }];
        }
      } catch (e) {
        console.log(`❌ Could not find user @${testUser}`);
        return;
      }
    }
  } else {
    // Normal mode: get leads from queue
    leadsToContact = leads.found.slice(0, Math.min(count, MAX_DMS_PER_RUN));
  }

  if (leadsToContact.length === 0) {
    console.log('No leads to contact. Run `npm run leads` first.');
    return;
  }

  console.log(`📨 Will send ${leadsToContact.length} DMs\n`);
  console.log('─'.repeat(60));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < leadsToContact.length; i++) {
    const lead = leadsToContact[i];
    const message = generatePersonalizedMessage(lead);

    console.log(`\n[${i + 1}/${leadsToContact.length}] @${lead.username}`);
    console.log(`   Message: "${message.substring(0, 60)}..."`);

    if (dryRun) {
      console.log('   ✓ Would send (dry run)');
      sent++;
    } else {
      const result = await sendDM(client, lead.id, lead.username, message);

      if (result.success) {
        console.log('   ✅ Sent!');
        sent++;
        dmLog.dailyCount++;

        // Move lead from found to contacted
        const idx = leads.found.findIndex(l => l.id === lead.id);
        if (idx !== -1) {
          const contacted = leads.found.splice(idx, 1)[0];
          contacted.contactedAt = new Date().toISOString();
          contacted.dmSent = message;
          leads.contacted.push(contacted);
        }

        // Log success
        dmLog.sent.push({
          username: lead.username,
          sentAt: new Date().toISOString(),
        });

      } else if (result.skip) {
        console.log(`   ⏭️  Skipped: ${result.error}`);
        skipped++;
        // Remove from found (can't DM them)
        leads.found = leads.found.filter(l => l.id !== lead.id);

      } else if (result.rateLimit) {
        console.log('   ⚠️  Rate limited! Stopping.');
        dmLog.failed.push({
          username: lead.username,
          error: 'Rate limited',
          at: new Date().toISOString(),
        });
        break;

      } else {
        console.log(`   ❌ Failed: ${result.error}`);
        failed++;
        dmLog.failed.push({
          username: lead.username,
          error: result.error,
          at: new Date().toISOString(),
        });
      }

      // Save progress after each DM
      saveLeads(leads);
      saveDMLog(dmLog);

      // Wait before next DM
      if (i < leadsToContact.length - 1) {
        console.log(`   ⏳ Waiting 60s before next DM...`);
        await new Promise(r => setTimeout(r, DELAY_BETWEEN_DMS));
      }
    }
  }

  console.log(`
─────────────────────────────────────────────────────────────────
                          SUMMARY
─────────────────────────────────────────────────────────────────
✅ Sent:    ${sent}
❌ Failed:  ${failed}
⏭️  Skipped: ${skipped}

Daily DMs used: ${dmLog.dailyCount}/50
Remaining leads: ${leads.found.length}
`);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Auto-DM System - Send DMs automatically to leads

Usage:
  node auto-dm.js [options]

Options:
  --count N         Send DMs to N leads (default: 10, max: 20)
  --dry-run         Preview messages without sending
  --test @username  Send test DM to specific user

Examples:
  node auto-dm.js --dry-run              Preview 10 DMs
  node auto-dm.js --count 15             Send 15 DMs
  node auto-dm.js --test @someuser       Test DM one user

Safety:
  - Max 50 DMs per day (prevents account flags)
  - 60 second delay between DMs
  - Skips users with DMs disabled
`);
} else {
  const dryRun = args.includes('--dry-run');
  const countIdx = args.indexOf('--count');
  const count = countIdx !== -1 ? parseInt(args[countIdx + 1]) || 10 : 10;
  const testIdx = args.indexOf('--test');
  const testUser = testIdx !== -1 ? args[testIdx + 1]?.replace('@', '') : null;

  runAutoDM({ count, dryRun, testUser });
}

module.exports = { runAutoDM, sendDM, generatePersonalizedMessage };
