#!/usr/bin/env node
/**
 * Lead Finder - Aggressive Marketing
 * Finds creators who need a link-in-bio tool and generates personalized outreach
 *
 * Usage:
 *   node lead-finder.js                    Find 20 leads
 *   node lead-finder.js --count 50         Find 50 leads
 *   node lead-finder.js --niche fitness    Find fitness creators
 *   node lead-finder.js --export           Export to CSV
 */

const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Target criteria
const SEARCH_QUERIES = [
  // People using Linktree (potential switchers)
  'linktree filter:links',
  '"linktr.ee" -is:retweet',

  // People complaining about link-in-bio tools
  '"linktree" expensive',
  '"linktree" "too much"',
  '"link in bio" frustrated',
  '"need a better" "link in bio"',

  // Creators who need link tools
  '"check my bio" -is:retweet',
  '"link in bio" creator',
  '"links in bio"',

  // Specific niches (high conversion)
  '"small business" "link in bio"',
  'artist "link in bio"',
  'musician "link in bio"',
  '"content creator" linktree',
  'coach "link in bio"',
  '"etsy shop" "link in bio"',
  'photographer portfolio link',
];

const NICHE_QUERIES = {
  fitness: [
    'fitness coach "link in bio"',
    'personal trainer linktree',
    '"fitness journey" "check bio"',
    'gym "link in bio"',
  ],
  art: [
    'artist commissions "link in bio"',
    'illustrator linktree',
    '"art prints" "link in bio"',
    'digital artist portfolio',
  ],
  music: [
    'musician "link in bio"',
    'producer linktree',
    '"new song" "link in bio"',
    'singer spotify "bio"',
  ],
  business: [
    'entrepreneur "link in bio"',
    '"small business" linktree',
    'founder "check bio"',
    'startup "link in bio"',
  ],
  coaching: [
    'life coach "link in bio"',
    'business coach linktree',
    'mentor "book a call" bio',
    'consultant "link in bio"',
  ],
  ecommerce: [
    '"etsy shop" "link in bio"',
    'shopify "link in bio"',
    '"shop now" "link in bio"',
    'handmade "check bio"',
  ],
};

// Message templates based on lead type
const MESSAGE_TEMPLATES = {
  linktree_user: {
    opener: "Hey! Saw you're using Linktree",
    pitch: "I built a free alternative with unlimited links + analytics. No monthly fees ever.",
    cta: "Would you be down to try it? I'll personally help you set it up in 2 min.",
  },
  complainer: {
    opener: "Saw your tweet about link-in-bio tools",
    pitch: "I felt the same way so I built my own - completely free, no catch.",
    cta: "Want me to send you the link? Happy to help migrate your stuff over.",
  },
  creator_generic: {
    opener: "Love your content!",
    pitch: "Quick Q - I made a free link-in-bio tool for creators. Better than Linktree, $0/month.",
    cta: "Would you try it out and give me feedback? Takes 30 seconds to set up.",
  },
  small_follower: {
    opener: "Hey! Your content deserves more reach",
    pitch: "I built a free link-in-bio tool specifically for growing creators. No fees until you're making money (and even then it's free lol)",
    cta: "Want to check it out?",
  },
};

// Leads storage
const leadsFile = path.join(__dirname, 'leads.json');
const exportDir = path.join(__dirname, 'exports');

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

  if (!config.twitter.bearerToken) {
    console.log('❌ Twitter API not configured. Add TWITTER_BEARER_TOKEN to .env');
    console.log('\nTo get leads manually, search Twitter for:');
    SEARCH_QUERIES.slice(0, 5).forEach(q => console.log(`  → ${q}`));
    return [];
  }

  const client = new TwitterApi(config.twitter.bearerToken);
  const leads = getLeads();
  const newLeads = [];

  // Select queries based on niche
  let queries = SEARCH_QUERIES;
  if (niche && NICHE_QUERIES[niche]) {
    queries = NICHE_QUERIES[niche];
    console.log(`🎯 Searching ${niche} niche...\n`);
  }

  // Shuffle and pick queries
  const shuffled = queries.sort(() => Math.random() - 0.5);
  const queriesToRun = shuffled.slice(0, Math.min(5, shuffled.length));

  for (const query of queriesToRun) {
    if (newLeads.length >= count) break;

    try {
      console.log(`🔍 Searching: "${query}"`);

      const results = await client.v2.search(query, {
        max_results: Math.min(20, count - newLeads.length + 5),
        'tweet.fields': ['author_id', 'created_at', 'public_metrics'],
        'user.fields': ['username', 'name', 'description', 'public_metrics', 'url'],
        expansions: ['author_id'],
      });

      if (!results.data?.data) {
        console.log('   No results');
        continue;
      }

      const users = results.includes?.users || [];

      for (const tweet of results.data.data) {
        if (newLeads.length >= count) break;

        const user = users.find(u => u.id === tweet.author_id);
        if (!user) continue;

        // Skip if already found
        const existingIds = [...leads.found, ...leads.contacted, ...leads.converted].map(l => l.id);
        if (existingIds.includes(user.id)) continue;

        // Skip very large accounts (unlikely to switch) or very small (not worth it)
        const followers = user.public_metrics?.followers_count || 0;
        if (followers > 100000 || followers < 100) continue;

        // Determine lead type
        let leadType = 'creator_generic';
        const bio = (user.description || '').toLowerCase();
        const tweetText = tweet.text.toLowerCase();

        if (bio.includes('linktr.ee') || bio.includes('linktree')) {
          leadType = 'linktree_user';
        } else if (tweetText.includes('expensive') || tweetText.includes('frustrated') || tweetText.includes('hate')) {
          leadType = 'complainer';
        } else if (followers < 5000) {
          leadType = 'small_follower';
        }

        const lead = {
          id: user.id,
          username: user.username,
          name: user.name,
          bio: user.description,
          followers: followers,
          following: user.public_metrics?.following_count || 0,
          tweets: user.public_metrics?.tweet_count || 0,
          url: user.url || null,
          foundVia: query,
          tweetThatFoundThem: tweet.text.substring(0, 100),
          leadType: leadType,
          suggestedMessage: MESSAGE_TEMPLATES[leadType],
          foundAt: new Date().toISOString(),
          profileUrl: `https://twitter.com/${user.username}`,
        };

        newLeads.push(lead);
        console.log(`   ✓ Found: @${user.username} (${followers} followers) - ${leadType}`);
      }

      // Rate limit protection
      await new Promise(r => setTimeout(r, 1000));

    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Save new leads
  leads.found.push(...newLeads);
  saveLeads(leads);

  return newLeads;
}

function generateOutreachList(leads) {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                    TODAY'S OUTREACH LIST                          ║
║                    ${new Date().toLocaleDateString().padEnd(40)}║
╚══════════════════════════════════════════════════════════════════╝
`);

  leads.forEach((lead, i) => {
    const msg = lead.suggestedMessage;
    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#${i + 1} @${lead.username} (${lead.followers.toLocaleString()} followers)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Profile: ${lead.profileUrl}
Bio: ${(lead.bio || 'No bio').substring(0, 80)}...
Type: ${lead.leadType}

📝 SUGGESTED DM:
"${msg.opener}

${msg.pitch}

${msg.cta}"
`);
  });

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total leads: ${leads.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIP: Personalize each message! Reference their bio or recent content.
`);
}

function exportToCSV(leads) {
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0];
  const filename = path.join(exportDir, `leads-${date}.csv`);

  const headers = ['Username', 'Name', 'Followers', 'Bio', 'Lead Type', 'Profile URL', 'Suggested Opener'];
  const rows = leads.map(l => [
    `@${l.username}`,
    l.name,
    l.followers,
    `"${(l.bio || '').replace(/"/g, '""')}"`,
    l.leadType,
    l.profileUrl,
    `"${l.suggestedMessage.opener}"`,
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  fs.writeFileSync(filename, csv);

  console.log(`\n📁 Exported to: ${filename}`);
  return filename;
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

function markContacted(username) {
  const leads = getLeads();
  const index = leads.found.findIndex(l => l.username.toLowerCase() === username.toLowerCase());
  if (index !== -1) {
    const lead = leads.found.splice(index, 1)[0];
    lead.contactedAt = new Date().toISOString();
    leads.contacted.push(lead);
    saveLeads(leads);
    console.log(`✓ Marked @${username} as contacted`);
  } else {
    console.log(`❌ Lead @${username} not found`);
  }
}

function markConverted(username) {
  const leads = getLeads();
  const index = leads.contacted.findIndex(l => l.username.toLowerCase() === username.toLowerCase());
  if (index !== -1) {
    const lead = leads.contacted.splice(index, 1)[0];
    lead.convertedAt = new Date().toISOString();
    leads.converted.push(lead);
    saveLeads(leads);
    console.log(`🎉 Marked @${username} as converted!`);
  } else {
    console.log(`❌ Lead @${username} not found in contacted list`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help')) {
    console.log(`
Lead Finder - Find creators who need LinkHub

Usage:
  node lead-finder.js [options]

Options:
  --count N        Find N leads (default: 20)
  --niche NAME     Focus on niche: fitness, art, music, business, coaching, ecommerce
  --export         Export to CSV
  --stats          Show lead statistics
  --contacted @username    Mark lead as contacted
  --converted @username    Mark lead as converted

Examples:
  node lead-finder.js --count 50
  node lead-finder.js --niche fitness
  node lead-finder.js --contacted johndoe
`);
    return;
  }

  if (args.includes('--stats')) {
    showStats();
    return;
  }

  const contactedIndex = args.indexOf('--contacted');
  if (contactedIndex !== -1 && args[contactedIndex + 1]) {
    markContacted(args[contactedIndex + 1].replace('@', ''));
    return;
  }

  const convertedIndex = args.indexOf('--converted');
  if (convertedIndex !== -1 && args[convertedIndex + 1]) {
    markConverted(args[convertedIndex + 1].replace('@', ''));
    return;
  }

  // Find leads
  const countIndex = args.indexOf('--count');
  const count = countIndex !== -1 ? parseInt(args[countIndex + 1]) || 20 : 20;

  const nicheIndex = args.indexOf('--niche');
  const niche = nicheIndex !== -1 ? args[nicheIndex + 1] : null;

  console.log(`\n🎯 Finding ${count} leads...\n`);
  const leads = await findLeads({ count, niche });

  if (leads.length > 0) {
    generateOutreachList(leads);

    if (args.includes('--export')) {
      exportToCSV(leads);
    }
  } else {
    console.log('\nNo new leads found. Try different search terms or check API config.');
  }
}

module.exports = { findLeads, generateOutreachList, exportToCSV, markContacted, markConverted };

if (require.main === module) {
  main();
}
