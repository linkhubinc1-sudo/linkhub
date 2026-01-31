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
  productUrl: 'https://yoursite.com', // Change after deploying
  yourTwitter: '@yourhandle',          // Your Twitter handle
  yourName: 'Your Name',               // Your name for emails
};

// ============================================
// CONTENT GENERATORS
// ============================================

const tweetTemplates = [
  `Most link-in-bio tools charge $5-20/month for basic features.\n\nI built one that's free. Forever.\n\nNo catch. No "upgrade to unlock."\n\n${CONFIG.productUrl}`,

  `POV: You stop paying for Linktree\n\nHere's a free alternative I made 👇\n${CONFIG.productUrl}`,

  `Creators: You don't need to pay for a link-in-bio tool.\n\nI built a free one with:\n• Unlimited links\n• Click analytics\n• Custom themes\n• No branding (Pro)\n\n${CONFIG.productUrl}`,

  `I was mass about paying $9/mo just to have multiple links in my bio.\n\nSo I built my own. It's free.\n\n${CONFIG.productUrl}`,

  `Just shipped: A Linktree alternative that's actually free.\n\nNo waitlist. No tricks. Just use it.\n\n${CONFIG.productUrl}`,

  `Your link-in-bio shouldn't cost more than your Netflix subscription.\n\nMine is free: ${CONFIG.productUrl}`,

  `The link-in-bio space is wild.\n\nCompanies charging $20/mo for what's essentially a list of links.\n\nI made a free version: ${CONFIG.productUrl}`,

  `New creators: Don't pay for Linktree.\n\nUse my free alternative until you're making money.\n\nThen still use it because it's free lol\n\n${CONFIG.productUrl}`,

  `Building in public update:\n\nLaunched my link-in-bio tool.\n\nFree tier: Unlimited everything\nPro tier: $5/mo for custom domain\n\nNo VC money. No growth hacks. Just a useful tool.\n\n${CONFIG.productUrl}`,

  `If you're a creator with < 10k followers, you don't need to pay for link tools.\n\nHere's a free one I made for you: ${CONFIG.productUrl}`,
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
    message: `Hey! Love your content. Quick Q - are you happy with Linktree? I built a free alternative and would love your honest feedback if you have 2 min.

No pressure at all: ${CONFIG.productUrl}`
  },
  {
    target: 'People tweeting about link-in-bio tools',
    message: `Saw your tweet about link tools! I actually just built a free alternative - would love to know if it solves what you were talking about.

${CONFIG.productUrl}

Either way, curious what features matter most to you?`
  },
  {
    target: 'Small influencers (1-10k followers)',
    message: `Hey! Been following your stuff - really good.

Random ask: I'm building a link-in-bio tool and looking for creator feedback. It's free and I'd personally help set it up if you want to try it.

No worries if not - just trying to make something creators actually want.`
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
