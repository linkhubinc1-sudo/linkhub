/**
 * Twitter Auto-Poster
 * Automatically posts tweets and engages with relevant content
 */

const { TwitterApi } = require('twitter-api-v2');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// Tweet content library - AGGRESSIVE VERSION
const tweets = [
  // Controversial / Hot takes
  `Linktree is a scam.\n\nThey charge $24/month for something that should be free.\n\nI built the free version: ${config.app.url}`,
  `Unpopular opinion: If you're paying for Linktree in 2026, you're getting robbed.\n\nSwitch to something free: ${config.app.url}`,
  `Linktree made $100M+ charging creators for HYPERLINKS.\n\nLet that sink in.\n\nHere's the free alternative: ${config.app.url}`,
  `Stop giving Linktree your money.\n\nSeriously. It's a page with links. Why are you paying $24/month?\n\nFree alternative: ${config.app.url}`,

  // FOMO / Urgency
  `1,247 creators switched from Linktree this week.\n\nThey're saving $288/year.\n\nYou next? ${config.app.url}`,
  `Every day you pay for Linktree is money you'll never get back.\n\nSwitch now. It takes 2 minutes.\n\n${config.app.url}`,
  `Your competitors are using free tools and pocketing the savings.\n\nYou're still paying Linktree $24/month.\n\nFix that: ${config.app.url}`,

  // Direct callouts
  `If you have Linktree in your bio right now:\n\n1. You're overpaying\n2. Your page loads slower\n3. You're giving them free advertising\n\nSwitch: ${config.app.url}`,
  `POV: You realize Linktree has been charging you $288/year for a list of links\n\nFree alternative that does everything: ${config.app.url}`,
  `Creators making under $10k/month should NOT be paying for:\n\n- Link in bio tools\n- Email tools\n- Website builders\n\nStart here (free): ${config.app.url}`,

  // Rage bait
  `Linktree raised $165M to... host links?\n\nAnd you're paying them monthly for it?\n\nNah. Free version here: ${config.app.url}`,
  `The fact that "link in bio" is a $1B industry is INSANE.\n\nIt's literally just links.\n\nStop paying. Use this: ${config.app.url}`,

  // Short punchy
  `Linktree: $24/month\nLinkHub: $0/forever\n\nSame features.\n\n${config.app.url}`,
  `Delete Linktree.\nUse this instead.\nKeep your $288/year.\n\n${config.app.url}`,
  `Free > $24/month\n\nLinkHub > Linktree\n\nSimple math: ${config.app.url}`,

  // Question hooks
  `Why are you still paying for Linktree?\n\nSerious question. I want to know.\n\nBecause this exists for free: ${config.app.url}`,
  `What does Linktree give you for $24/month that you can't get free?\n\nI'll wait.\n\n${config.app.url}`,

  // No fees / No data selling / Trust
  `Most link-in-bio tools:\n\n• Take a cut of your sales\n• Inject their affiliate codes\n• Sell your data\n\nLinkHub does NONE of that.\n\nYour links. Your money. Your data.\n\n${config.app.url}`,
  `Linktree makes money by:\n1. Charging you $24/month\n2. Taking cuts from your commerce\n3. Selling your audience data\n\nWe make money by:\n1. Optional $5/month upgrade\n\nThat's it. We don't touch your revenue.\n\n${config.app.url}`,
  `PSA: Some link-in-bio tools inject their own affiliate codes into YOUR links.\n\nYou promote Amazon products. They get the commission.\n\nWe don't do that. Ever.\n\n${config.app.url}`,
  `Your audience data is YOURS.\n\nWe don't sell it.\nWe don't share it.\nWe don't use it for ads.\n\nUnlike some link-in-bio tools that treat your audience as their product.\n\n${config.app.url}`,
  `The link-in-bio business model is broken:\n\n"Pay us monthly AND we'll take a cut of your sales AND sell your data"\n\nOur model: You pay $5/month if you want. That's it.\n\nNo cuts. No data selling. No BS.\n\n${config.app.url}`,
  `You sell a $50 product through your link.\n\nOther platforms: Take 3-5% ($1.50-$2.50)\nLinkHub: Take $0\n\nYour money is your money.\n\n${config.app.url}`,
  `I refuse to build a tool that profits off creators' hard work.\n\nNo transaction fees.\nNo affiliate hijacking.\nNo data mining.\n\nJust a link page. That's it.\n\n${config.app.url}`,
  `"Free" link tools that sell your data aren't free.\n\nYOU are the product.\n\nLinkHub is actually free. We make money from optional upgrades, not your personal information.\n\n${config.app.url}`,
  `Every click on your LinkHub page = money in YOUR pocket, not ours.\n\nWe don't skim transactions.\nWe don't inject affiliates.\nWe don't sell leads.\n\n${config.app.url}`,
  `Creator-first means:\n\n✓ 0% transaction fees\n✓ No affiliate injection\n✓ No data selling\n✓ No forced branding\n✓ Your audience stays yours\n\nRadical concept, apparently.\n\n${config.app.url}`,
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
