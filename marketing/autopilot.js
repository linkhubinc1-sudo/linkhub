#!/usr/bin/env node
/**
 * LinkHub Marketing Autopilot
 *
 * This script generates ready-to-post content so you just copy-paste.
 * Run: node marketing/autopilot.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION - Edit these once
// ============================================
const CONFIG = {
  productName: 'LinkHub',
  productUrl: 'https://linkhub-production-4cad.up.railway.app',
  yourTwitter: '@linkhubinc1',
  yourName: 'LinkHub',
};

// ============================================
// CONTENT GENERATORS
// ============================================

const tweetTemplates = [
  // Controversial / Hot takes
  `Linktree is a scam.\n\nThey charge $24/month for something that should be free.\n\nI built the free version: ${CONFIG.productUrl}`,

  `Unpopular opinion: If you're paying for Linktree in 2026, you're getting robbed.\n\nSwitch to something free: ${CONFIG.productUrl}`,

  `Linktree made $100M+ charging creators for HYPERLINKS.\n\nLet that sink in.\n\nHere's the free alternative: ${CONFIG.productUrl}`,

  `Stop giving Linktree your money.\n\nSeriously. It's a page with links. Why are you paying $24/month?\n\nFree alternative: ${CONFIG.productUrl}`,

  // FOMO / Urgency
  `1,247 creators switched from Linktree this week.\n\nThey're saving $288/year.\n\nYou next? ${CONFIG.productUrl}`,

  `Every day you pay for Linktree is money you'll never get back.\n\nSwitch now. It takes 2 minutes.\n\n${CONFIG.productUrl}`,

  `Your competitors are using free tools and pocketing the savings.\n\nYou're still paying Linktree $24/month.\n\nFix that: ${CONFIG.productUrl}`,

  // Direct callouts
  `If you have Linktree in your bio right now:\n\n1. You're overpaying\n2. Your page loads slower\n3. You're giving them free advertising\n\nSwitch: ${CONFIG.productUrl}`,

  `POV: You realize Linktree has been charging you $288/year for a list of links\n\nFree alternative that does everything: ${CONFIG.productUrl}`,

  `Creators making under $10k/month should NOT be paying for:\n\n- Link in bio tools\n- Email tools\n- Website builders\n\nStart here (free): ${CONFIG.productUrl}`,

  // Social proof
  `"I can't believe I paid Linktree for 2 years"\n\n- literally every creator who switches to LinkHub\n\n${CONFIG.productUrl}`,

  `Asked 50 creators why they pay for Linktree.\n\nNone of them had a good answer.\n\nFree alternative: ${CONFIG.productUrl}`,

  // Rage bait
  `Linktree raised $165M to... host links?\n\nAnd you're paying them monthly for it?\n\nNah. Free version here: ${CONFIG.productUrl}`,

  `The fact that "link in bio" is a $1B industry is INSANE.\n\nIt's literally just links.\n\nStop paying. Use this: ${CONFIG.productUrl}`,

  // Short punchy
  `Linktree: $24/month\nLinkHub: $0/forever\n\nSame features.\n\n${CONFIG.productUrl}`,

  `Delete Linktree.\nUse this instead.\nKeep your $288/year.\n\n${CONFIG.productUrl}`,

  `Free > $24/month\n\nLinkHub > Linktree\n\nSimple math: ${CONFIG.productUrl}`,

  // Question hooks
  `Why are you still paying for Linktree?\n\nSerious question. I want to know.\n\nBecause this exists for free: ${CONFIG.productUrl}`,

  `What does Linktree give you for $24/month that you can't get free?\n\nI'll wait.\n\n${CONFIG.productUrl}`,

  // No fees / No data selling / Trust
  `Most link-in-bio tools:\n\n• Take a cut of your sales\n• Inject their affiliate codes\n• Sell your data\n\nLinkHub does NONE of that.\n\nYour links. Your money. Your data.\n\n${CONFIG.productUrl}`,

  `Linktree makes money by:\n1. Charging you $24/month\n2. Taking cuts from your commerce\n3. Selling your audience data\n\nWe make money by:\n1. Optional $5/month upgrade\n\nThat's it. We don't touch your revenue.\n\n${CONFIG.productUrl}`,

  `PSA: Some link-in-bio tools inject their own affiliate codes into YOUR links.\n\nYou promote Amazon products. They get the commission.\n\nWe don't do that. Ever.\n\n${CONFIG.productUrl}`,

  `Your audience data is YOURS.\n\nWe don't sell it.\nWe don't share it.\nWe don't use it for ads.\n\nUnlike some link-in-bio tools that treat your audience as their product.\n\n${CONFIG.productUrl}`,

  `The link-in-bio business model is broken:\n\n"Pay us monthly AND we'll take a cut of your sales AND sell your data"\n\nOur model: You pay $5/month if you want. That's it.\n\nNo cuts. No data selling. No BS.\n\n${CONFIG.productUrl}`,

  `You sell a $50 product through your link.\n\nOther platforms: Take 3-5% ($1.50-$2.50)\nLinkHub: Take $0\n\nYour money is your money.\n\n${CONFIG.productUrl}`,

  `I refuse to build a tool that profits off creators' hard work.\n\nNo transaction fees.\nNo affiliate hijacking.\nNo data mining.\n\nJust a link page. That's it.\n\n${CONFIG.productUrl}`,

  `"Free" link tools that sell your data aren't free.\n\nYOU are the product.\n\nLinkHub is actually free. We make money from optional upgrades, not your personal information.\n\n${CONFIG.productUrl}`,

  `Every click on your LinkHub page = money in YOUR pocket, not ours.\n\nWe don't skim transactions.\nWe don't inject affiliates.\nWe don't sell leads.\n\n${CONFIG.productUrl}`,

  `Creator-first means:\n\n✓ 0% transaction fees\n✓ No affiliate injection\n✓ No data selling\n✓ No forced branding\n✓ Your audience stays yours\n\nRadical concept, apparently.\n\n${CONFIG.productUrl}`,
];

const redditPosts = [
  {
    subreddit: 'r/Entrepreneur',
    title: 'I built a free Linktree alternative - looking for feedback',
    body: `Hey everyone,

I got tired of paying for link-in-bio tools, so I built my own and made it free.

**What it does:**
- Unlimited links
- Click tracking/analytics
- Multiple themes
- Mobile-responsive

**What I'm looking for:**
Honest feedback. What's missing? What would make you switch?

Link: ${CONFIG.productUrl}

Not trying to spam - genuinely want to make something useful. Happy to answer questions.`
  },
  {
    subreddit: 'r/SideProject',
    title: 'Launched my first SaaS: A free link-in-bio tool',
    body: `Finally shipped something!

Built a Linktree alternative. Free tier has no limits (unlimited links, analytics, themes).

Pro is $5/mo for custom domains and no branding.

**Tech stack:** Node.js, SQLite, vanilla JS (keeping it simple)

**Lessons learned:**
1. Building is 10% of the work
2. Marketing is everything
3. Simple > feature-rich

Would love feedback from this community: ${CONFIG.productUrl}

What was your first launch like?`
  },
  {
    subreddit: 'r/smallbusiness',
    title: 'Free tool for your social media bio link',
    body: `Made something that might help some of you.

If you have an Instagram/TikTok for your business, you know the "link in bio" struggle. Most tools charge $5-20/month.

I built a free one: ${CONFIG.productUrl}

- Add unlimited links
- See who's clicking what
- Looks professional

Free forever, no credit card required.

Let me know if you have questions!`
  }
];

const twitterDMs = [
  {
    target: 'Creators with Linktree in bio',
    message: `Noticed you're using Linktree - you know that's $24/month right?

Made a free version with the same features. Takes 2 min to switch and you keep your money.

${CONFIG.productUrl}

Want me to help you migrate?`
  },
  {
    target: 'People complaining about costs',
    message: `Saw your post about creator tool costs. Totally feel that.

Just made a free link-in-bio tool specifically because Linktree is overpriced. No catch, no "premium unlock" BS.

${CONFIG.productUrl}

LMK if you try it - happy to help set up.`
  },
  {
    target: 'Creators posting about new projects/launches',
    message: `Congrats on the launch! Quick tip - if you're using Linktree, you're wasting $288/year.

I built a free alternative - same features, no monthly fee.

${CONFIG.productUrl}

Takes 2 min to switch. Happy to help if needed.`
  },
  {
    target: 'Anyone mentioning "link in bio"',
    message: `Hey - saw you mention link in bio stuff.

If you're paying for Linktree or similar, I made a free alternative. Not trying to sell anything - it's literally free.

${CONFIG.productUrl}

Just hate seeing creators waste money on overpriced tools.`
  },
  {
    target: 'Creators with large followings (10k+)',
    message: `Hey - love your content. Random question: are you paying for your link-in-bio tool?

I built a free alternative to Linktree. Some bigger creators have been switching to save the $288/year.

Would love your feedback: ${CONFIG.productUrl}

No pitch, just genuinely curious what features matter to you.`
  }
];

const dailyTasks = [
  '□ Post 1 tweet from the generated content below',
  '□ Reply to 3 tweets mentioning "link in bio" or "linktree"',
  '□ Send 2 DMs to creators (use templates below)',
  '□ Check if anyone signed up yesterday - send them a welcome message',
  '□ Spend 5 min in one Reddit/Discord community being helpful (no selling)',
];

// ============================================
// GENERATE TODAY'S CONTENT
// ============================================

function generateDailyContent() {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Pick random content for today
  const todaysTweet = tweetTemplates[Math.floor(Math.random() * tweetTemplates.length)];
  const todaysReddit = redditPosts[Math.floor(Math.random() * redditPosts.length)];
  const todaysDM = twitterDMs[Math.floor(Math.random() * twitterDMs.length)];

  const output = `
╔══════════════════════════════════════════════════════════════════╗
║                   LINKHUB MARKETING AUTOPILOT                     ║
║                        ${today.padEnd(35)}║
╚══════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 TODAY'S TASKS (10 min total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${dailyTasks.join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🐦 TODAY'S TWEET (copy & paste to Twitter)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${todaysTweet}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📨 TODAY'S DM TEMPLATE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: ${todaysDM.target}

${todaysDM.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 REDDIT POST (post 1-2x per week, not daily)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subreddit: ${todaysReddit.subreddit}
Title: ${todaysReddit.title}

${todaysReddit.body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔍 TWITTER SEARCH QUERIES (find people to help/DM)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Copy these into Twitter search:

1. "link in bio" need OR looking OR want
2. "linktree" expensive OR alternative OR hate
3. "bio link" recommendation OR suggest
4. "too many links" instagram OR tiktok

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run this script daily: node marketing/autopilot.js

`;

  return output;
}

// ============================================
// GENERATE WEEKLY SUMMARY
// ============================================

function generateWeeklyPlan() {
  return `
╔══════════════════════════════════════════════════════════════════╗
║                      WEEKLY MARKETING PLAN                        ║
╚══════════════════════════════════════════════════════════════════╝

MONDAY
├─ Post tweet #1
├─ Send 3 DMs to creators
└─ 10 min Reddit browsing (be helpful, not salesy)

TUESDAY
├─ Post tweet #2
├─ Send 3 DMs to creators
└─ Reply to comments on yesterday's posts

WEDNESDAY
├─ Post tweet #3
├─ Reddit post in r/Entrepreneur or r/SideProject
└─ Send 3 DMs

THURSDAY
├─ Post tweet #4
├─ Send 3 DMs
└─ Check analytics, reply to any user feedback

FRIDAY
├─ Post tweet #5
├─ Send 3 DMs
└─ Write a short Twitter thread about building LinkHub

SATURDAY
├─ Light day: 1 tweet, check messages
└─ Plan next week's content

SUNDAY
├─ Rest or catch up
└─ Review what worked this week

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TIME COMMITMENT: ~10 min/day, ~1 hour/week total
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;
}

// ============================================
// MAIN
// ============================================

const args = process.argv.slice(2);

if (args.includes('--week')) {
  console.log(generateWeeklyPlan());
} else {
  console.log(generateDailyContent());
}

console.log('\n💡 TIP: Run with --week to see the weekly plan\n');
