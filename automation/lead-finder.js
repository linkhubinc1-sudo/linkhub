#!/usr/bin/env node
/**
 * Smart Lead Finder - Finds REAL creators who need a link-in-bio tool
 * Filters out competitors, marketers, and people already promoting tools
 *
 * Usage:
 *   node lead-finder.js                    Find 20 qualified leads
 *   node lead-finder.js --count 50         Find 50 leads
 *   node lead-finder.js --niche fitness    Find fitness creators
 *   node lead-finder.js --deep             Deep profile checking (slower but better)
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Browser profile for persistence
const USER_DATA_DIR = path.join(__dirname, '.browser-profile');

// COMPETITOR KEYWORDS - Skip anyone with these in their bio or tweets
const COMPETITOR_KEYWORDS = [
  // Direct competitors
  'linktree', 'linktr.ee', 'beacons.ai', 'beacons', 'stan.store', 'stan store',
  'bio.link', 'biolink', 'link.bio', 'linkbio', 'tap.bio', 'tapbio',
  'shorby', 'campsite.bio', 'campsite', 'linkpop', 'link pop',
  'milkshake', 'milkshake.app', 'snipfeed', 'koji', 'linkin.bio',
  'lnk.bio', 'bio.fm', 'carrd', 'about.me', 'linkfire', 'smarturl',
  'hypeddit', 'fanlink', 'toneden', 'feature.fm', 'linkgenie',
  'jotform', 'hoo.be', 'hoobe', 'msha.ke', 'withkoji', 'komi',

  // Marketing/tool promotion signals
  'founder of', 'ceo of', 'building', 'i built', 'my startup',
  'link in bio tool', 'bio link tool', 'saas founder', 'indie hacker',
  'we help creators', 'for creators', 'creator economy',
  'affiliate', 'promo code', 'discount code', 'use code',

  // Agencies and marketers
  'marketing agency', 'social media manager', 'smm', 'digital marketing',
  'growth hacker', 'brand partnerships', 'influencer marketing',
];

// GOOD LEAD SIGNALS - People who actually need help
const GOOD_LEAD_SIGNALS = [
  'commission', 'commissions open', 'dm for', 'dm me', 'book me',
  'available for', 'hire me', 'freelance', 'artist', 'illustrator',
  'photographer', 'musician', 'producer', 'coach', 'trainer',
  'small business', 'shop owner', 'etsy', 'handmade', 'creator',
  'content creator', 'youtuber', 'streamer', 'twitch', 'podcast',
  'author', 'writer', 'blogger', 'vlogger', 'model', 'dancer',
  'makeup artist', 'hairstylist', 'tattoo', 'nail tech', 'lashes',
  'teacher', 'tutor', 'consultant', 'therapist', 'nutritionist',
];

// SEARCH QUERIES - Focus on people USING links, not discussing tools
const SEARCH_QUERIES = [
  // People actively sharing their stuff (these are USERS not promoters)
  '"check out my" -linktree -beacons -stan',
  '"link in my bio" -"link in bio tool" -affiliate',
  '"shop link in bio" -promoting -promo',
  '"booking link" bio',
  '"commissions open" "link in bio"',

  // People frustrated with current options
  '"linktree is" expensive',
  '"linktree" ugly OR basic OR limited',
  '"need a better" bio link',
  '"looking for" "link in bio"',
  'hate linktree',
  '"any alternatives to" linktree',

  // Small creators asking for help
  '"how do i" "link in bio"',
  '"what do you use for" bio link',
  'recommend "link in bio"',
];

// NICHE-SPECIFIC QUERIES - Target specific creator types
const NICHE_QUERIES = {
  fitness: [
    'personal trainer "dm me" -linktree',
    'fitness coach "book" bio -beacons',
    'gym "check my bio" -stan',
    '"workout program" "link in bio"',
  ],
  art: [
    'artist "commissions open" -linktree',
    'illustrator "dm for" -beacons',
    '"art prints" "link in bio" -stan',
    'digital artist portfolio bio',
  ],
  music: [
    'musician "new song" bio -linkfire',
    'producer "dm for beats" -toneden',
    '"listen to my" "link in bio"',
    'singer songwriter bio link',
  ],
  beauty: [
    'makeup artist "book" bio -linktree',
    'hairstylist "appointments" bio',
    'nail tech "dm to book" -beacons',
    'lash tech "link in bio"',
  ],
  business: [
    'small business owner "shop" bio -stan',
    'etsy seller "link in bio"',
    'handmade "check my bio" -linktree',
    'entrepreneur "book a call" bio',
  ],
  photo: [
    'photographer "booking" bio -linktree',
    'photo "dm for rates" -beacons',
    '"photo session" "link in bio"',
    'portrait photographer bio',
  ],
};

// Leads storage
const leadsFile = path.join(__dirname, 'leads.json');

function getLeads() {
  try {
    return JSON.parse(fs.readFileSync(leadsFile, 'utf8'));
  } catch {
    return { found: [], contacted: [], converted: [], skipped: [] };
  }
}

function saveLeads(leads) {
  fs.writeFileSync(leadsFile, JSON.stringify(leads, null, 2));
}

// Check if text contains competitor keywords
function isCompetitor(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return COMPETITOR_KEYWORDS.some(keyword => lower.includes(keyword.toLowerCase()));
}

// Score how good a lead is (higher = better)
function scoreLead(bio, tweet) {
  let score = 0;
  const text = ((bio || '') + ' ' + (tweet || '')).toLowerCase();

  // Negative signals (might be competitor/marketer)
  if (isCompetitor(text)) return -100;

  // Positive signals
  GOOD_LEAD_SIGNALS.forEach(signal => {
    if (text.includes(signal.toLowerCase())) score += 10;
  });

  // Extra points for clear creator signals
  if (text.includes('commission')) score += 15;
  if (text.includes('book me') || text.includes('hire me')) score += 15;
  if (text.includes('small business')) score += 10;
  if (text.includes('dm for')) score += 10;
  if (text.includes('available for')) score += 10;

  // Penalty for marketing speak
  if (text.includes('10x') || text.includes('scale')) score -= 20;
  if (text.includes('agency') || text.includes('helping brands')) score -= 30;
  if (text.includes('free trial') || text.includes('sign up')) score -= 30;

  return score;
}

async function findLeads(options = {}) {
  const { count = 20, niche = null, deep = false } = options;

  console.log(`\n🎯 Finding ${count} QUALIFIED leads...\n`);
  console.log('🛡️  Filtering out competitors, marketers, and tool promoters\n');

  // Ensure profile directory exists
  if (!fs.existsSync(USER_DATA_DIR)) {
    fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
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

    // Select queries based on niche
    let queries = SEARCH_QUERIES;
    if (niche && NICHE_QUERIES[niche]) {
      queries = NICHE_QUERIES[niche];
      console.log(`🎯 Targeting ${niche} niche specifically...\n`);
    }

    const leads = getLeads();
    const newLeads = [];
    const skippedUsers = [];
    const existingUsernames = [
      ...leads.found,
      ...leads.contacted,
      ...leads.converted,
      ...(leads.skipped || [])
    ].map(l => l.username?.toLowerCase());

    let totalScanned = 0;
    let totalSkipped = 0;

    // Search each query
    for (const query of queries) {
      if (newLeads.length >= count) break;

      console.log(`\n🔍 Searching: "${query}"`);

      try {
        const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for tweets to load
        await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 }).catch(() => null);

        // Scroll to load more tweets
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 800));
          await new Promise(r => setTimeout(r, 1500));
        }

        // Extract users and their tweet content
        const foundUsers = await page.evaluate(() => {
          const tweets = document.querySelectorAll('[data-testid="tweet"]');
          const users = [];

          tweets.forEach(tweet => {
            try {
              const userLink = tweet.querySelector('a[href^="/"][role="link"]');
              if (!userLink) return;

              const href = userLink.getAttribute('href');
              const username = href.replace('/', '').split('/')[0];

              if (!username || username.length === 0 ||
                  username.includes('search') || username.includes('hashtag') ||
                  username.includes('i/')) return;

              // Get the tweet text
              const tweetTextEl = tweet.querySelector('[data-testid="tweetText"]');
              const tweetText = tweetTextEl?.textContent || '';

              // Get display name
              const nameElement = tweet.querySelector('[data-testid="User-Name"]');
              const displayName = nameElement?.textContent?.split('@')[0]?.trim() || username;

              users.push({
                username,
                displayName,
                tweetText,
              });
            } catch (e) {
              // Skip errors
            }
          });

          // Remove duplicates
          return users.filter((u, i, arr) =>
            arr.findIndex(x => x.username === u.username) === i
          );
        });

        // Process found users with qualification
        for (const user of foundUsers) {
          if (newLeads.length >= count) break;
          if (existingUsernames.includes(user.username.toLowerCase())) continue;

          totalScanned++;

          // Quick check - skip if tweet itself has competitor keywords
          if (isCompetitor(user.tweetText)) {
            console.log(`   ✗ @${user.username} - promoting a tool`);
            totalSkipped++;
            existingUsernames.push(user.username.toLowerCase());
            continue;
          }

          let bio = '';
          let score = 0;

          // Deep mode: visit profile to check bio
          if (deep) {
            try {
              await page.goto(`https://twitter.com/${user.username}`, {
                waitUntil: 'networkidle2',
                timeout: 15000
              });

              bio = await page.evaluate(() => {
                const bioEl = document.querySelector('[data-testid="UserDescription"]');
                return bioEl?.textContent || '';
              });

              // Check if bio has competitor links
              if (isCompetitor(bio)) {
                console.log(`   ✗ @${user.username} - competitor in bio`);
                skippedUsers.push({
                  username: user.username,
                  reason: 'competitor_in_bio',
                  skippedAt: new Date().toISOString(),
                });
                totalSkipped++;
                existingUsernames.push(user.username.toLowerCase());
                continue;
              }

              await new Promise(r => setTimeout(r, 1000));
            } catch (e) {
              // Profile check failed, continue anyway
            }
          }

          // Score the lead
          score = scoreLead(bio, user.tweetText);

          if (score < 0) {
            console.log(`   ✗ @${user.username} - low quality (score: ${score})`);
            totalSkipped++;
            existingUsernames.push(user.username.toLowerCase());
            continue;
          }

          // Good lead!
          const lead = {
            id: Date.now() + Math.random(),
            username: user.username,
            name: user.displayName,
            bio: bio || 'Not checked',
            tweetContext: user.tweetText.substring(0, 200),
            score,
            foundVia: query,
            foundAt: new Date().toISOString(),
            profileUrl: `https://twitter.com/${user.username}`,
          };

          newLeads.push(lead);
          existingUsernames.push(user.username.toLowerCase());

          const scoreLabel = score >= 30 ? '🔥' : score >= 15 ? '✓' : '○';
          console.log(`   ${scoreLabel} @${user.username} (score: ${score})`);
        }

        // Delay between searches to avoid rate limits
        await new Promise(r => setTimeout(r, 3000));

      } catch (error) {
        console.log(`   ⚠️ Error searching: ${error.message}`);
      }
    }

    await browser.close();

    // Save leads
    if (newLeads.length > 0) {
      // Sort by score (best leads first)
      newLeads.sort((a, b) => b.score - a.score);
      leads.found.push(...newLeads);

      // Track skipped users so we don't check them again
      if (skippedUsers.length > 0) {
        if (!leads.skipped) leads.skipped = [];
        leads.skipped.push(...skippedUsers);
      }

      saveLeads(leads);

      console.log(`\n${'─'.repeat(50)}`);
      console.log(`📊 RESULTS`);
      console.log(`${'─'.repeat(50)}`);
      console.log(`   Scanned:    ${totalScanned} users`);
      console.log(`   Filtered:   ${totalSkipped} competitors/marketers`);
      console.log(`   Qualified:  ${newLeads.length} real leads`);
      console.log(`${'─'.repeat(50)}`);
      console.log(`\n✅ Found ${newLeads.length} qualified leads!`);
      console.log(`📁 Saved to: ${leadsFile}`);

      // Show top 5 leads
      console.log(`\n🔥 TOP LEADS:`);
      newLeads.slice(0, 5).forEach((lead, i) => {
        console.log(`   ${i + 1}. @${lead.username} (score: ${lead.score})`);
        if (lead.tweetContext) {
          console.log(`      "${lead.tweetContext.substring(0, 60)}..."`);
        }
      });
      console.log('');

    } else {
      console.log('\n⚠️ No qualified leads found. Try a different niche or run again later.\n');
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
  const avgScore = leads.found.length > 0
    ? (leads.found.reduce((sum, l) => sum + (l.score || 0), 0) / leads.found.length).toFixed(1)
    : 0;

  console.log(`
📊 LEAD STATS
${'─'.repeat(40)}
Found:       ${leads.found.length} qualified leads
Contacted:   ${leads.contacted.length}
Converted:   ${leads.converted.length}
Skipped:     ${(leads.skipped || []).length} (competitors/marketers)
${'─'.repeat(40)}
Avg Score:   ${avgScore}
Conversion:  ${leads.contacted.length > 0 ? ((leads.converted.length / leads.contacted.length) * 100).toFixed(1) : 0}%
${'─'.repeat(40)}
`);

  // Show score distribution
  if (leads.found.length > 0) {
    const hot = leads.found.filter(l => (l.score || 0) >= 30).length;
    const warm = leads.found.filter(l => (l.score || 0) >= 15 && (l.score || 0) < 30).length;
    const cold = leads.found.filter(l => (l.score || 0) < 15).length;

    console.log(`Lead Quality:`);
    console.log(`   🔥 Hot (30+):   ${hot}`);
    console.log(`   ✓  Warm (15+):  ${warm}`);
    console.log(`   ○  Cold (<15):  ${cold}`);
    console.log('');
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Smart Lead Finder - Find real creators, not competitors

Usage:
  node lead-finder.js                    Find 20 qualified leads
  node lead-finder.js --count 50         Find 50 leads
  node lead-finder.js --niche fitness    Target specific niche
  node lead-finder.js --deep             Check profiles (slower but better)
  node lead-finder.js --stats            Show lead statistics

Available niches:
  fitness, art, music, beauty, business, photo

Examples:
  node lead-finder.js --niche art --count 30
  node lead-finder.js --deep --count 10
`);
    return;
  }

  if (args.includes('--stats')) {
    showStats();
    return;
  }

  const countIndex = args.indexOf('--count');
  const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) || 20 : 20;

  const nicheIndex = args.indexOf('--niche');
  const niche = nicheIndex !== -1 ? args[nicheIndex + 1] : null;

  const deep = args.includes('--deep');

  await findLeads({ count, niche, deep });
}

module.exports = { findLeads, getLeads, saveLeads, isCompetitor, scoreLead };

if (require.main === module) {
  main();
}
