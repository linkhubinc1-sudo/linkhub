# Get Your API Keys (5 minutes total)

I can't click buttons for you, but here are the EXACT steps. Just follow them.

---

## 1. GMAIL APP PASSWORD (2 min)

This lets the system send you email reports.

1. Go to: https://myaccount.google.com/apppasswords
2. Sign in as linkhubinc1@gmail.com
3. Click "Select app" → choose "Mail"
4. Click "Select device" → choose "Other" → type "LinkHub"
5. Click "Generate"
6. **Copy the 16-character password** (looks like: xxxx xxxx xxxx xxxx)

Paste it in `.env`:
```
GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
```

**Note:** If you don't see App Passwords, you need to enable 2FA first:
https://myaccount.google.com/security → 2-Step Verification → Turn on

---

## 2. TWITTER/X API (3 min)

This lets the system auto-post tweets.

1. Go to: https://developer.twitter.com/en/portal/dashboard
2. Sign up / Sign in (use or create a Twitter account for LinkHub)
3. Click "Create Project"
   - Name: LinkHub
   - Use case: Making a bot
4. Click "Create App" under your project
   - Name: LinkHub Bot
5. Go to "Keys and tokens" tab
6. Under "Consumer Keys" click "Regenerate" → **Copy both keys**
7. Under "Authentication Tokens" click "Generate" → **Copy both tokens**
8. Under "Bearer Token" click "Generate" → **Copy it**

Paste in `.env`:
```
TWITTER_API_KEY=your-api-key
TWITTER_API_SECRET=your-api-secret
TWITTER_ACCESS_TOKEN=your-access-token
TWITTER_ACCESS_TOKEN_SECRET=your-access-token-secret
TWITTER_BEARER_TOKEN=your-bearer-token
```

**Important:** In the Twitter Developer Portal, go to your App Settings → "User authentication settings" → Set up → Enable "Read and Write" permissions.

---

## 3. STRIPE (2 min)

This lets the system track revenue.

1. Go to: https://dashboard.stripe.com/register (or login)
2. Complete signup
3. Go to: https://dashboard.stripe.com/apikeys
4. Copy the "Secret key" (starts with sk_)
5. Go to: https://dashboard.stripe.com/products
6. Click "Add product"
   - Name: LinkHub Pro Monthly
   - Price: $5/month recurring
7. Copy the Price ID (starts with price_)
8. Create another product:
   - Name: LinkHub Pro Yearly
   - Price: $48/year recurring
9. Copy that Price ID too

Paste in `.env`:
```
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PRICE_PRO_MONTHLY=price_xxxxx
STRIPE_PRICE_PRO_YEARLY=price_xxxxx
```

---

## Done!

Once you've added all the keys to `.env`, run:

```bash
cd C:\Users\jamoo\projects\linkhub
npm install
npm run autopilot:once
```

This will:
- Post a tweet
- Send you a test email report
- Show your revenue dashboard

Then to run it 24/7, deploy to Railway and it handles the scheduling.

---

## Quick Reference - What Each Key Does

| Key | What it does |
|-----|--------------|
| GMAIL_APP_PASSWORD | Sends daily reports to your inbox |
| TWITTER_* | Auto-posts tweets |
| STRIPE_* | Tracks revenue, handles payments |
