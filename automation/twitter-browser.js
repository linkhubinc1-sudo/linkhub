#!/usr/bin/env node
/**
 * Twitter Browser Automation (FREE - no API needed)
 * Uses Puppeteer to control a real browser
 *
 * First run: Will open browser for you to log in manually once
 * After that: Runs headless automatically
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const COOKIES_FILE = path.join(__dirname, '.twitter-cookies.json');
const USER_DATA_DIR = path.join(__dirname, '.chrome-data');

// Tweet templates
const tweets = [
  `Most link-in-bio tools charge $5-20/month for basic features.\n\nI built one that's free. Forever.\n\nNo catch. No "upgrade to unlock."`,
  `POV: You stop paying for Linktree\n\nHere's a free alternative I made 👇`,
  `Creators: You don't need to pay for a link-in-bio tool.\n\nI built a free one with:\n• Unlimited links\n• Click analytics\n• Custom themes`,
  `Just shipped: A Linktree alternative that's actually free.\n\nNo waitlist. No tricks. Just use it.`,
  `Your link-in-bio shouldn't cost more than your Netflix subscription.\n\nMine is free.`,
  `New creators: Don't pay for Linktree.\n\nUse my free alternative until you're making money.\n\nThen still use it because it's free lol`,
  `The link-in-bio space is wild.\n\nCompanies charging $20/mo for what's essentially a list of links.\n\nI made a free version.`,
  `If you're a creator with < 10k followers, you don't need to pay for link tools.\n\nHere's a free one I made for you.`,
];

// Track posted tweets
const historyFile = path.join(__dirname, '.tweet-history-browser.json');

function getHistory() {
  try {
    return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
  } catch {
    return { lastIndex: -1, posted: [] };
  }
}

function saveHistory(history) {
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

function getNextTweet() {
  const history = getHistory();
  const nextIndex = (history.lastIndex + 1) % tweets.length;
  history.lastIndex = nextIndex;
  history.posted.push({ index: nextIndex, at: new Date().toISOString() });
  saveHistory(history);

  // Add URL to tweet
  const url = config.app.url || 'https://linkhub.app';
  return tweets[nextIndex] + `\n\n${url}`;
}

async function launchBrowser(headless = false) {
  const browser = await puppeteer.launch({
    headless: headless ? 'new' : false,
    userDataDir: USER_DATA_DIR,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
  return browser;
}

async function isLoggedIn(page) {
  try {
    await page.goto('https://twitter.com/home', { waitUntil: 'networkidle2', timeout: 30000 });
    // Check if we're on the home feed (logged in) or login page
    const url = page.url();
    return !url.includes('login') && !url.includes('i/flow');
  } catch {
    return false;
  }
}

async function loginManually() {
  console.log('\n🔐 Opening browser for manual login...');
  console.log('   1. Log into Twitter/X in the browser window');
  console.log('   2. Once logged in, close the browser');
  console.log('   3. Run this script again\n');

  const browser = await launchBrowser(false);
  const page = await browser.newPage();

  await page.goto('https://twitter.com/login', { waitUntil: 'networkidle2' });

  // Wait for user to close browser
  await new Promise(resolve => {
    browser.on('disconnected', resolve);
  });

  console.log('✅ Browser closed. Run the script again to post tweets.');
}

async function postTweet(tweetText = null) {
  const tweet = tweetText || getNextTweet();

  console.log('🐦 Posting tweet...');
  console.log(`   "${tweet.substring(0, 50)}..."\n`);

  let browser;
  try {
    browser = await launchBrowser(true); // headless
    const page = await browser.newPage();

    // Set user agent to look like real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // Check if logged in
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log('❌ Not logged in. Run with --login first.');
      await browser.close();
      return { success: false, error: 'Not logged in' };
    }

    // Go to compose tweet
    await page.goto('https://twitter.com/compose/tweet', { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for tweet box
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });

    // Type tweet
    await page.type('[data-testid="tweetTextarea_0"]', tweet, { delay: 50 });

    // Wait a bit (human-like)
    await new Promise(r => setTimeout(r, 1000));

    // Click post button
    await page.click('[data-testid="tweetButton"]');

    // Wait for tweet to post
    await new Promise(r => setTimeout(r, 3000));

    console.log('✅ Tweet posted!');
    await browser.close();
    return { success: true, tweet };

  } catch (error) {
    console.log('❌ Error posting tweet:', error.message);
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}

async function sendDM(username, message) {
  console.log(`📨 Sending DM to @${username}...`);

  let browser;
  try {
    browser = await launchBrowser(true);
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log('❌ Not logged in');
      await browser.close();
      return { success: false, error: 'Not logged in' };
    }

    // Go to user's profile
    await page.goto(`https://twitter.com/${username}`, { waitUntil: 'networkidle2', timeout: 30000 });

    // Click message button
    await page.waitForSelector('[data-testid="sendDMFromProfile"]', { timeout: 10000 });
    await page.click('[data-testid="sendDMFromProfile"]');

    // Wait for DM modal
    await page.waitForSelector('[data-testid="dmComposerTextInput"]', { timeout: 10000 });

    // Type message
    await page.type('[data-testid="dmComposerTextInput"]', message, { delay: 30 });

    // Wait (human-like)
    await new Promise(r => setTimeout(r, 500));

    // Send
    await page.click('[data-testid="dmComposerSendButton"]');

    await new Promise(r => setTimeout(r, 2000));

    console.log('✅ DM sent!');
    await browser.close();
    return { success: true };

  } catch (error) {
    console.log('❌ Error sending DM:', error.message);
    if (browser) await browser.close();
    return { success: false, error: error.message };
  }
}

async function searchAndFindLeads(query = 'linktree alternative') {
  console.log(`🔍 Searching for "${query}"...`);

  let browser;
  try {
    browser = await launchBrowser(true);
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log('❌ Not logged in');
      await browser.close();
      return [];
    }

    // Search
    const searchUrl = `https://twitter.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for results
    await page.waitForSelector('[data-testid="tweet"]', { timeout: 10000 });

    // Get usernames from tweets
    const leads = await page.evaluate(() => {
      const tweets = document.querySelectorAll('[data-testid="tweet"]');
      const users = [];
      tweets.forEach(tweet => {
        const userLink = tweet.querySelector('a[href^="/"]');
        if (userLink) {
          const href = userLink.getAttribute('href');
          const username = href.replace('/', '').split('/')[0];
          if (username && !users.includes(username)) {
            users.push(username);
          }
        }
      });
      return users.slice(0, 10);
    });

    console.log(`   Found ${leads.length} potential leads`);
    await browser.close();
    return leads;

  } catch (error) {
    console.log('❌ Error searching:', error.message);
    if (browser) await browser.close();
    return [];
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--login')) {
    await loginManually();
  } else if (args.includes('--tweet')) {
    await postTweet();
  } else if (args.includes('--dm')) {
    const userIdx = args.indexOf('--dm');
    const username = args[userIdx + 1];
    const message = args.slice(userIdx + 2).join(' ') || 'Hey! Check out LinkHub - free link-in-bio tool.';
    if (username) {
      await sendDM(username, message);
    } else {
      console.log('Usage: --dm @username Your message here');
    }
  } else if (args.includes('--search')) {
    const query = args.slice(args.indexOf('--search') + 1).join(' ') || 'linktree alternative';
    await searchAndFindLeads(query);
  } else {
    console.log(`
Twitter Browser Automation (FREE)

Usage:
  node twitter-browser.js --login     First time: log in manually
  node twitter-browser.js --tweet     Post a tweet
  node twitter-browser.js --dm @user  Send DM to user
  node twitter-browser.js --search    Search for leads

First time setup:
  1. Run: node twitter-browser.js --login
  2. Log into Twitter in the browser window
  3. Close the browser
  4. Now you can use --tweet and --dm
`);
  }
}

module.exports = { postTweet, sendDM, searchAndFindLeads, loginManually };

if (require.main === module) {
  main();
}
