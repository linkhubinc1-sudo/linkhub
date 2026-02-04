#!/usr/bin/env node
/**
 * Post tweets for ALL products
 */

const { postTweet } = require('./twitter-browser');

const PRODUCT_TWEETS = {
  linkhub: [
    `Creators: Stop paying for Linktree.

I built a free alternative:
• Unlimited links
• Click analytics
• Custom themes
• No watermarks

100% free. No catch.

https://linkhub-app.fly.dev`,
  ],
  contentai: [
    `Need content for your business but can't afford a writer?

I'm offering AI-powered content at 70% less than freelancers:

• Blog posts - $50
• Social content - $50/mo
• Product descriptions - $75
• Email sequences - $200

Fast turnaround. Human-edited quality.

https://contentai-app.fly.dev`,
  ],
  templates: [
    `Just dropped 5 premium Notion templates:

• Startup OS - $29
• Student Dashboard - $19
• Finance Tracker - $19
• Resume Bundle - $9
• Social Media Kit - $19

All mobile-friendly with setup guides.

https://templatehub-app.fly.dev`,
  ],
};

async function main() {
  const product = process.argv[2] || 'linkhub';
  const tweets = PRODUCT_TWEETS[product];

  if (!tweets) {
    console.log('Products: linkhub, contentai, templates');
    process.exit(1);
  }

  const tweet = tweets[Math.floor(Math.random() * tweets.length)];
  console.log(`\nPosting for ${product}...`);

  await postTweet(tweet);
}

main();
