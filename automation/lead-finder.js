#!/usr/bin/env node
/**
 * Lead Finder - Browser-based (FREE, no API needed)
 * Finds creators who need a link-in-bio tool
 *
 * Usage:
 *   node lead-finder.js                    Find 20 leads
 *   node lead-finder.js --count 50         Find 50 leads
 *   node lead-finder.js --niche fitness    Find fitness creators
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Browser profile for persistence
const USER_DATA_DIR = path.join(__dirname, '.browser-profile');

// Search queries
const SEARCH_QUERIES = [
  'linktree alternative',
  '"link in bio" creator',
  'linktree expensive',
  '"need a" "link in bio"',
  '"check my bio" -is:retweet',
  'small business "link in bio"',
  'artist "link in bio"',
  'content creator linktree',
];

const NICHE_QUERIES = {
  fitness: ['fitness coach "link in bio"', 'personal trainer linktree'],
  art: ['artist commissions "link in bio"', 'illustrator portfolio'],
  music: ['musician "link in bio"', 'producer linktree'],
  business: ['entrepreneur "link in bio"', 'small business linktree'],
};

// Leads storage
const leadsFile = path.join(__dirname, 'leads.json');

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

async function findLeads(options = {}) {
  const { count = 20, niche = null } = options;

  console.log(`\n🎯 Finding ${count} leads using browser automation...\n`);

  // Ensure profile directory exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser so user can see/intervene
      userDataDir: USER_DATA_DIR,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800',
      ],
      defaultViewport: null,
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Check if logged in
    console.log('📱 Checking Twitter login...');
    await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2', timeout: 30000 });

    const url = page.url();
    if (url.includes('login') || url.includes('i/flow')) {
      console.log('\n❌ Not logged in to Twitter/X');
      console.log('👉 Please log in via the Control Panel first (click "Login to X")');
      console.log('   Then try finding leads again.\n');
      await browser.close();
      return [];
    }

    console.log('✅ Logged in!\n');

    // Select queries
    let queries = SEARCH_QUERIES;
    if (niche && NICHE_QUERIES[niche]) {
      queries = NICHE_QUERIES[niche];
      console.log(`🎯 Searching ${niche} niche...\n`);
    }

    const leads = getLeads();
    const newLeads = [];
    const existingUsernames = [...leads.found, ...leads.contacted, ...leads.converted].map(l => l.username?.toLowerCase());

    // Search each query
    for (const query of queries.slice(0, 3)) {
      if (newLeads.length >= count) break;

      console.log(`🔍 Searching: "${query}"`);

      try {
        const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for tweets to load
        await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 }).catch(() => null);

        // Scroll a bit to load more
        await page.evaluate(() => window.scrollBy(0, 500));
        await new Promise(r => setTimeout(r, 2000));

        // Extract usernames from tweets
        const foundUsers = await page.evaluate(() => {
          const tweets = document.querySelectorAll('[data-testid="tweet"]');
          const users = [];

          tweets.forEach(tweet => {
            try {
              // Get username from the tweet
              const userLink = tweet.querySelector('a[href^="/"][role="link"]');
              if (userLink) {
                const href = userLink.getAttribute('href');
                const username = href.replace('/', '').split('/')[0];
                if (username && username.length > 0 && !username.includes('search') && !username.includes('hashtag')) {
                  // Try to get follower count
                  const nameElement = tweet.querySelector('[data-testid="User-Name"]');
                  users.push({
                    username: username,
                    displayName: nameElement?.textContent?.split('@')[0]?.trim() || username,
                  });
                }
              }
            } catch (e) {
              // Skip errors
            }
          });

          // Remove duplicates
          return users.filter((u, i, arr) => arr.findIndex(x => x.username === u.username) === i);
        });

        // Process found users
        for (const user of foundUsers) {
          if (newLeads.length >= count) break;
          if (existingUsernames.includes(user.username.toLowerCase())) continue;

          const lead = {
            id: Date.now() + Math.random(),
            username: user.username,
            name: user.displayName,
            followers: 'Unknown',
            foundVia: query,
            leadType: 'creator_generic',
            foundAt: new Date().toISOString(),
            profileUrl: `https://twitter.com/${user.username}`,
          };

          newLeads.push(lead);
          existingUsernames.push(user.username.toLowerCase());
          console.log(`   ✓ Found: @${user.username}`);
        }

        // Delay between searches
        await new Promise(r => setTimeout(r, 3000));

      } catch (error) {
        console.log(`   ⚠️ Error searching: ${error.message}`);
      }
    }

    await browser.close();

    // Save leads
    if (newLeads.length > 0) {
      leads.found.push(...newLeads);
      saveLeads(leads);
      console.log(`\n✅ Found ${newLeads.length} new leads!`);
      console.log(`📁 Saved to: ${leadsFile}\n`);
    } else {
      console.log('\n⚠️ No new leads found. Try different search terms.\n');
    }

    return newLeads;

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (browser) await browser.close();
    return [];
  }
}

function showStats() {
  const leads = getLeads();
  console.log(`
📊 LEAD STATS
─────────────────────────────────
Found:      ${leads.found.length}
Contacted:  ${leads.contacted.length}
Converted:  ${leads.converted.length}
─────────────────────────────────
Conversion: ${leads.contacted.length > 0 ? ((leads.converted.length / leads.contacted.length) * 100).toFixed(1) : 0}%
`);
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    showStats();
    return;
  }

  const countIndex = args.indexOf('--count');
  const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) || 20 : 20;

  const nicheIndex = args.indexOf('--niche');
  const niche = nicheIndex !== -1 ? args[nicheIndex + 1] : null;

  await findLeads({ count, niche });
}

module.exports = { findLeads, getLeads, saveLeads };

if (require.main === module) {
  main();
}
