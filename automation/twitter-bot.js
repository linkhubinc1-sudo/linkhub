/**
 * Twitter Auto-Poster
 * Automatically posts tweets and engages with relevant content
 */

const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Tweet content library
const tweets = [
  `Most link-in-bio tools charge $5-20/month for basic features.\n\nI built one that's free. Forever.\n\nNo catch. No "upgrade to unlock."\n\n${config.app.url}`,
  `POV: You stop paying for Linktree\n\nHere's a free alternative I made 👇\n${config.app.url}`,
  `Creators: You don't need to pay for a link-in-bio tool.\n\nI built a free one with:\n• Unlimited links\n• Click analytics\n• Custom themes\n• No branding\n\n${config.app.url}`,
  `I was mass about paying $9/mo just to have multiple links in my bio.\n\nSo I built my own. It's free.\n\n${config.app.url}`,
  `Just shipped: A Linktree alternative that's actually free.\n\nNo waitlist. No tricks. Just use it.\n\n${config.app.url}`,
  `Your link-in-bio shouldn't cost more than your Netflix subscription.\n\nMine is free: ${config.app.url}`,
  `The link-in-bio space is wild.\n\nCompanies charging $20/mo for what's essentially a list of links.\n\nI made a free version: ${config.app.url}`,
  `New creators: Don't pay for Linktree.\n\nUse my free alternative until you're making money.\n\nThen still use it because it's free lol\n\n${config.app.url}`,
  `Building in public update:\n\nLaunched my link-in-bio tool.\n\nFree tier: Unlimited everything\nPro tier: $5/mo for custom domain\n\nNo VC money. No growth hacks. Just a useful tool.\n\n${config.app.url}`,
  `If you're a creator with < 10k followers, you don't need to pay for link tools.\n\nHere's a free one I made for you: ${config.app.url}`,
  `Unpopular opinion: Most "link in bio" tools are overpriced.\n\nSo I built a free one.\n\n${config.app.url}`,
  `Why I stopped using Linktree:\n\n• $9/mo for basic analytics\n• $24/mo for custom domains\n• Felt like a scam\n\nBuilt my own. Made it free.\n\n${config.app.url}`,
  `Every creator needs a link-in-bio.\n\nNot every creator needs to pay $10/mo for one.\n\nFree alternative: ${config.app.url}`,
  `Started charging $0/month for a link-in-bio tool.\n\nBusiness is booming.\n\n${config.app.url}`,
  `The best part about my link-in-bio tool?\n\nIt costs $0.\n\nThe second best part?\n\nIt actually works.\n\n${config.app.url}`,
];

// Track what we've posted to avoid duplicates
const historyFile = path.join(__dirname, '.tweet-history.json');

function getHistory() {
  try {
    return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  } catch {
    return { posted: [], lastIndex: -1 };
  }
}

function saveHistory(history) {
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function getNextTweet() {
  const history = getHistory();
  let nextIndex = (history.lastIndex + 1) % tweets.length;

  // If we've gone through all tweets, shuffle the order
  if (nextIndex === 0 && history.posted.length >= tweets.length) {
    history.posted = [];
  }

  history.lastIndex = nextIndex;
  history.posted.push(new Date().toISOString());
  saveHistory(history);

  return tweets[nextIndex];
}

async function postTweet(customText = null) {
  if (!config.twitter.apiKey) {
    console.log('❌ Twitter API not configured. Add keys to .env');
    console.log('\nWould have posted:');
    console.log(customText || getNextTweet());
    return null;
  }

  const client = new TwitterApi({
    appKey: config.twitter.apiKey,
    appSecret: config.twitter.apiSecret,
    accessToken: config.twitter.accessToken,
    accessSecret: config.twitter.accessTokenSecret,
  });

  const tweet = customText || getNextTweet();

  try {
    const result = await client.v2.tweet(tweet);
    console.log(`✅ Tweet posted! ID: ${result.data.id}`);
    console.log(`   ${tweet.substring(0, 50)}...`);
    return result;
  } catch (error) {
    console.error('❌ Failed to post tweet:', error.message);
    return null;
  }
}

async function searchAndEngage() {
  if (!config.twitter.bearerToken) {
    console.log('❌ Twitter Bearer Token not configured');
    return;
  }

  const client = new TwitterApi(config.twitter.bearerToken);

  const searchQueries = [
    '"link in bio" need',
    '"linktree alternative"',
    '"linktree expensive"',
    'linktree free alternative',
  ];

  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];

  try {
    const results = await client.v2.search(query, {
      max_results: 10,
      'tweet.fields': ['author_id', 'created_at'],
    });

    console.log(`🔍 Found ${results.data?.length || 0} tweets for "${query}"`);

    // Log potential engagement opportunities
    if (results.data) {
      results.data.slice(0, 5).forEach(tweet => {
        console.log(`   → ${tweet.text.substring(0, 80)}...`);
      });
    }

    return results.data || [];
  } catch (error) {
    console.error('❌ Search failed:', error.message);
    return [];
  }
}

// Export functions
module.exports = { postTweet, searchAndEngage, getNextTweet };

// Run directly
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--post')) {
    postTweet();
  } else if (args.includes('--search')) {
    searchAndEngage();
  } else if (args.includes('--preview')) {
    console.log('📝 Next tweet preview:\n');
    console.log(getNextTweet());
  } else {
    console.log('Usage:');
    console.log('  node twitter-bot.js --post     Post next scheduled tweet');
    console.log('  node twitter-bot.js --search   Find engagement opportunities');
    console.log('  node twitter-bot.js --preview  Preview next tweet');
  }
}
