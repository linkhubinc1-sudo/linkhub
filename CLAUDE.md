# HEY CLAUDE - READ THIS FIRST

> Tell user to say: **"Read C:\Users\jamoo\projects\linkhub\CLAUDE.md first"**

---

## WHAT IS THIS

**LinkHub** = A link-in-bio SaaS (like Linktree) with full marketing automation.

Owner wants **ZERO manual work**. Everything should be automated.

---

## HOW TO RUN IT

```bash
cd C:\Users\jamoo\projects\linkhub
npm run panel
```

Opens control panel at **http://localhost:3001**

That's the main thing. One panel controls everything.

---

## FIRST TIME SETUP

If Twitter isn't working:
1. Run `npm run panel`
2. Click "Twitter Login" button in the panel
3. Log into Twitter (@LinkHubInc) in the browser that opens
4. Close the browser
5. Click "Start Automation"

---

## CREDENTIALS

- **Gmail:** linkhubinc1@gmail.com / BleepBloop4386!?
- **Twitter:** @LinkHubInc (same email)
- **Twitter Dev Portal:** developer.twitter.com (API keys in .env but we use free browser automation instead)

---

## WHAT'S ALREADY BUILT

| Feature | Status | File |
|---------|--------|------|
| Control Panel | ✅ Done | `/automation/control-panel.js` |
| Browser Twitter Bot | ✅ Done | `/automation/twitter-browser.js` |
| Lead Finder | ✅ Done | `/automation/lead-finder.js` |
| Auto-DM System | ✅ Done | `/automation/auto-dm.js` |
| Email Reports | ✅ Done | `/automation/email-reporter.js` |
| Revenue Tracker | ✅ Done | `/automation/revenue-tracker.js` |
| Scheduler | ✅ Done | `/automation/scheduler.js` |
| Core Web App | ✅ Done | `/server.js` |
| Hub Architecture | ✅ Done | `/apps/` |

---

## IMPORTANT NOTES

1. **Twitter API costs $100/month** - So we use FREE browser automation (Puppeteer) instead
2. **Everything from one panel** - User wants minimal clicks
3. **CLAUDE.md must stay updated** - Update this file when you change things
4. **Zero work for owner** - Automate everything possible

---

## COMMANDS REFERENCE

```bash
npm run panel          # 🎛️ MAIN - Control panel at localhost:3001
npm run twitter:login  # Login to Twitter (opens browser)
npm run twitter:tweet  # Post a tweet
npm run leads          # Find new leads
npm run autopilot      # Run 24/7 scheduler
npm start              # Web app at localhost:3000
```

---

## FILE STRUCTURE

```
C:\Users\jamoo\projects\linkhub\
├── CLAUDE.md              ← YOU ARE HERE
├── .env                   ← API keys
├── server.js              ← Main web app
├── automation/
│   ├── control-panel.js   ← One panel to rule them all
│   ├── twitter-browser.js ← Free Twitter automation
│   ├── lead-finder.js     ← Find people to DM
│   ├── auto-dm.js         ← Send DMs
│   ├── scheduler.js       ← Cron jobs
│   └── config.js          ← Settings
├── apps/                  ← Hub apps (expandable)
└── routes/                ← API routes
```

---

## WHAT OWNER TYPICALLY ASKS FOR

- "Make it do X automatically"
- "Add a new feature to the hub"
- "Fix something that broke"
- "Make the marketing more aggressive"

Always update this file after making changes.

---

## CURRENT STATUS

**Last updated:** 2026-01-30

**What's working:**
- Control panel ✅
- Browser-based Twitter automation ✅
- Lead finding ✅
- DM sending ✅

**What still needs setup:**
- Gmail app password (for email reports)
- Stripe keys (for payments)

---

## CHANGELOG

| Date | Changes |
|------|---------|
| 2026-01-30 | Built everything: control panel, browser automation, leads, DMs, hub |

