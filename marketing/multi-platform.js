#!/usr/bin/env node
/**
 * AGGRESSIVE MULTI-PLATFORM MARKETING
 * Posts to: Twitter, Reddit, and more
 */

const puppeteer = require('puppeteer');
const path = require('path');

const BRAVE_PATH = 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe';
const USER_DATA = 'C:/Users/jamoo/AppData/Local/BraveSoftware/Brave-Browser/User Data';

const PRODUCTS = {
  linkhub: {
    url: 'https://linkhub-app.fly.dev',
    name: 'LinkHub',
    tagline: 'Free Linktree alternative',
    subreddits: ['SideProject', 'startups', 'Entrepreneur', 'socialmedia', 'Instagram'],
  },
  contentai: {
    url: 'https://contentai-app.fly.dev',
    name: 'AI Content Agency',
    tagline: 'AI-powered content writing - $50-200 per piece',
    subreddits: ['Entrepreneur', 'content_marketing', 'copywriting', 'freelance', 'smallbusiness'],
  },
  templates: {
    url: 'https://templatehub-app.fly.dev',
    name: 'Template Store',
    tagline: 'Premium Notion & Canva templates - $9-29',
    subreddits: ['Notion', 'productivity', 'GetStudying', 'LifeProTips', 'Entrepreneur'],
  },
};

const REDDIT_POSTS = {
  linkhub: [
    {
      title: "I built a free Linktree alternative - no catch, just free forever",
      body: `Hey everyone!

I was tired of paying $5-20/month for link-in-bio tools, so I built my own and made it free.

**What it does:**
- Unlimited links
- Click analytics
- Custom themes
- No watermarks

**Why it's free:**
I don't need your money. I built this as a side project and want to help other creators.

Check it out: {url}

Would love feedback!`,
    },
    {
      title: "Show r/SideProject: Free link-in-bio tool I made over the weekend",
      body: `Built this because I thought Linktree was overpriced for what it does.

Features:
- Unlimited links (for free, not like Linktree)
- Analytics
- Multiple themes
- SEO optimized

Tech stack: Node.js, Express, SQLite, deployed on Fly.io

{url}

Let me know what you think!`,
    },
  ],
  contentai: [
    {
      title: "I'm offering AI-powered content writing at a fraction of freelancer rates",
      body: `Hey entrepreneurs!

I run a small AI content agency that delivers high-quality content at 70-80% less than traditional freelancers.

**Services:**
- Blog posts ($50-100)
- Social media content ($50/month)
- Product descriptions ($75)
- Email sequences ($100-200)

**How it works:**
AI does the heavy lifting, then human editors polish it. Fast turnaround, consistent quality.

Perfect for startups and small businesses that need content but can't afford a full-time writer.

{url}

DM me for samples!`,
    },
  ],
  templates: [
    {
      title: "I made some Notion templates that actually work - $9-29",
      body: `Hey r/Notion!

I've been obsessed with productivity systems and spent months creating templates that I actually use daily.

**What I've got:**
- Content Calendar ($19) - Plan and schedule all your content
- Startup Dashboard ($29) - Track everything for your business
- Student Planner ($9) - Assignments, exams, notes in one place
- Finance Tracker ($19) - Budget, expenses, goals

All templates are:
- Mobile-friendly
- Easy to customize
- Come with setup guide

{url}

Happy to answer questions!`,
    },
  ],
};

async function launchBrowser() {
  return puppeteer.launch({
    headless: false,
    executablePath: BRAVE_PATH,
    userDataDir: USER_DATA,
    args: ['--profile-directory=Default'],
    defaultViewport: null,
  });
}

async function postToReddit(subreddit, title, body) {
  console.log(`📝 Posting to r/${subreddit}...`);

  let browser;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    // Go to subreddit submit page
    await page.goto(`https://www.reddit.com/r/${subreddit}/submit`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for page load
    await new Promise(r => setTimeout(r, 3000));

    // Check if logged in
    const url = page.url();
    if (url.includes('login')) {
      console.log('   ❌ Not logged into Reddit');
      await browser.close();
      return false;
    }

    // Click "Text" tab if available
    try {
      await page.click('[role="tab"]:has-text("Text")');
      await new Promise(r => setTimeout(r, 1000));
    } catch {}

    // Fill title
    const titleInput = await page.$('textarea[placeholder*="Title"], input[placeholder*="Title"]');
    if (titleInput) {
      await titleInput.type(title, { delay: 30 });
    }

    // Fill body
    await new Promise(r => setTimeout(r, 1000));
    const bodyInput = await page.$('div[contenteditable="true"], textarea[placeholder*="Text"]');
    if (bodyInput) {
      await bodyInput.type(body, { delay: 20 });
    }

    console.log('   ✅ Form filled - review and submit manually');

    // Keep browser open for manual review
    await new Promise(r => setTimeout(r, 30000));
    await browser.close();
    return true;

  } catch (error) {
    console.log('   ❌ Error:', error.message);
    if (browser) await browser.close();
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const product = args[0] || 'linkhub';
  const productData = PRODUCTS[product];

  if (!productData) {
    console.log('Products: linkhub, contentai, templates');
    process.exit(1);
  }

  console.log(`\n🚀 Marketing ${productData.name}\n`);

  // Get a random post template
  const posts = REDDIT_POSTS[product] || REDDIT_POSTS.linkhub;
  const post = posts[Math.floor(Math.random() * posts.length)];
  const body = post.body.replace('{url}', productData.url);

  // Post to first subreddit (manually review before posting more)
  const subreddit = productData.subreddits[0];
  await postToReddit(subreddit, post.title, body);
}

if (require.main === module) {
  main();
}

module.exports = { postToReddit, PRODUCTS };
