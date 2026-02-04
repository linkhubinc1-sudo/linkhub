# LinkHub: Minimal Effort Setup Guide

This guide is for people who want to do the absolute minimum work.

---

## CURRENT STATUS (Last updated: Feb 3, 2026)

### ✅ COMPLETED
- [x] Code pushed to GitHub: https://github.com/linkhubinc1-sudo/linkhub
- [x] Twitter API keys configured
- [x] Stripe account created (test mode)
- [x] Stripe monthly price ID set (`price_1SvqOdGURQ9dmmIltzjd8Jxu`)

### ⏳ REMAINING (You must do these manually)

**1. Login to Railway and deploy (5 min)**
```
railway login
```
Then in browser: https://railway.app → New Project → Deploy from GitHub → select linkhub

**2. Set Railway environment variables:**
Copy all values from your local `.env` file into Railway's environment variables panel.
Required vars: `JWT_SECRET`, `NODE_ENV`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO_MONTHLY`, and all `TWITTER_*` keys.

**3. After Railway gives you a URL, set up Stripe webhook:**
- Go to https://dashboard.stripe.com/webhooks
- Add endpoint: `https://YOUR-RAILWAY-URL/api/billing/webhook`
- Select events: `checkout.session.completed`, `customer.subscription.*`
- Copy the webhook signing secret → add to Railway as `STRIPE_WEBHOOK_SECRET`

**4. Optional: Gmail for reports**
- Go to https://myaccount.google.com/apppasswords
- Generate app password → add to Railway as `GMAIL_APP_PASSWORD`

---

## THE ONLY THINGS YOU MUST DO YOURSELF

### One-Time Setup (~30 minutes total)

#### 1. Create a Railway Account (5 min)
1. Go to **https://railway.app**
2. Click "Login" → "Login with GitHub"
3. That's it. Free tier is enough to start.

#### 2. Create a Stripe Account (15 min)
1. Go to **https://stripe.com**
2. Sign up with your email
3. Complete identity verification (they need this legally)
4. Go to Developers → API Keys → Copy your "Secret key"

#### 3. Deploy the App (5 min)
1. Push this code to GitHub (instructions below)
2. In Railway: New Project → Deploy from GitHub repo
3. Add these environment variables in Railway:
   - `JWT_SECRET` = any random string (mash keyboard)
   - `STRIPE_SECRET_KEY` = the key from step 2
   - `NODE_ENV` = production
4. Railway gives you a free URL like `linkhub-abc123.up.railway.app`

#### 4. Create Stripe Products (5 min)
1. In Stripe Dashboard → Products → Add Product
2. Name: "LinkHub Pro Monthly", Price: $5/month recurring
3. Copy the Price ID (starts with `price_`)
4. Add to Railway env: `STRIPE_PRICE_PRO_MONTHLY` = that ID
5. Optional: Create yearly at $48/year, add as `STRIPE_PRICE_PRO_YEARLY`

### Daily Marketing (~10 min/day)

Run this command to get today's content:
```
node marketing/autopilot.js
```

It gives you:
- A tweet to copy-paste
- A DM template
- Search queries to find leads
- A checklist

**Your only job:** Copy the content and post it.

---

## PUSH TO GITHUB (One Command)

If you have GitHub CLI installed:
```
gh repo create linkhub --public --source=. --push
```

If not, go to github.com/new, create "linkhub" repo, then:
```
git remote add origin https://github.com/YOURUSERNAME/linkhub.git
git push -u origin master
```

---

## OPTIONAL: Buy a Domain (~$12/year)

1. Go to **porkbun.com** or **namecheap.com**
2. Search for a domain (e.g., `getlinkhub.com`)
3. Buy it (~$10-12/year)
4. In Railway: Settings → Domains → Add your domain
5. Follow Railway's instructions to point your domain

---

## YOUR DAILY ROUTINE (10 min)

```
Morning (5 min):
1. Run: node marketing/autopilot.js
2. Copy the tweet → Post to Twitter
3. Copy the DM → Send to 2 people

Evening (5 min):
4. Check for replies/signups
5. Respond to anyone who messaged
```

That's it. Do this for 30-60 days consistently.

---

## REALISTIC EXPECTATIONS

| Timeframe | What to Expect |
|-----------|----------------|
| Week 1 | 5-20 signups, 0 paid |
| Week 4 | 50-100 signups, 1-5 paid |
| Month 3 | 200-500 signups, 10-25 paid ($50-125 MRR) |
| Month 6 | 500-1000+ signups, 25-50+ paid ($125-250+ MRR) |

The difference between $0 and $500/month is consistency, not talent.

---

## IF YOU GET STUCK

Common issues:

**"npm not found"** → Install Node.js from nodejs.org

**"Stripe webhook errors"** → You need to set up webhook in Stripe Dashboard pointing to yoursite.com/api/billing/webhook

**"No one is signing up"** → Are you actually posting daily? Most people quit after 3 days.

**"Should I pay for ads?"** → Not until you have 10+ organic paying customers.
