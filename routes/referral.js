const express = require('express');
const crypto = require('crypto');
const db = require('../database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Generate a short referral code
function generateReferralCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Get or create referral code for current user
router.get('/code', authenticateToken, (req, res) => {
  try {
    let user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user.id);

    if (!user.referral_code) {
      const code = generateReferralCode();
      db.prepare('UPDATE users SET referral_code = ? WHERE id = ?').run(code, req.user.id);
      user = { referral_code: code };
    }

    const baseUrl = process.env.APP_URL || 'https://linkhub.app';

    res.json({
      code: user.referral_code,
      link: `${baseUrl}/register?ref=${user.referral_code}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// Get referral stats
router.get('/stats', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT referral_code FROM users WHERE id = ?').get(req.user.id);

    if (!user.referral_code) {
      return res.json({
        totalReferrals: 0,
        pendingReferrals: 0,
        completedReferrals: 0,
        earnings: 0
      });
    }

    // Count referrals
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM referrals
      WHERE referrer_id = ?
    `).get(req.user.id);

    res.json({
      totalReferrals: stats.total || 0,
      pendingReferrals: stats.pending || 0,
      completedReferrals: stats.completed || 0,
      // Future: calculate actual earnings
      earnings: (stats.completed || 0) * 5 // $5 per completed referral (placeholder)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// Validate a referral code (public endpoint)
router.get('/validate/:code', (req, res) => {
  try {
    const user = db.prepare('SELECT id, username FROM users WHERE referral_code = ?').get(req.params.code.toUpperCase());

    if (!user) {
      return res.status(404).json({ valid: false });
    }

    res.json({ valid: true, referrer: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to validate code' });
  }
});

// Track referral on signup (called internally from auth.js)
function trackReferral(referralCode, newUserId) {
  try {
    const referrer = db.prepare('SELECT id FROM users WHERE referral_code = ?').get(referralCode.toUpperCase());

    if (!referrer) return false;

    // Create referral record
    db.prepare(`
      INSERT INTO referrals (referrer_id, referred_id, referral_code, status, completed_at)
      VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP)
    `).run(referrer.id, newUserId, referralCode.toUpperCase());

    // Update the new user's referred_by field
    db.prepare('UPDATE users SET referred_by = ? WHERE id = ?').run(referrer.id, newUserId);

    return true;
  } catch (err) {
    console.error('Error tracking referral:', err);
    return false;
  }
}

module.exports = router;
module.exports.trackReferral = trackReferral;
