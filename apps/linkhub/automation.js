/**
 * LinkHub Automation Tasks
 * These run on schedule via the main scheduler
 */

const { postTweet, searchAndEngage } = require('../../automation/twitter-bot');
const { findLeads } = require('../../automation/lead-finder');
const { runAutoDM } = require('../../automation/auto-dm');
const { sendDailyReport } = require('../../automation/email-reporter');

module.exports = {
  // Morning routine (runs at 8am)
  morning: async () => {
    console.log('🌅 Running LinkHub morning routine...');

    // Find new leads
    const leads = await findLeads({ count: 30 });
    console.log(`   Found ${leads.length} leads`);

    // Send daily report
    await sendDailyReport();

    return { leads: leads.length };
  },

  // Tweet times (9am, 2pm)
  tweet: async () => {
    console.log('🐦 Posting scheduled tweet...');
    await postTweet();
  },

  // DM routine (runs at 10am, 3pm)
  outreach: async () => {
    console.log('📨 Running auto-DM routine...');
    await runAutoDM({ count: 10 });
  },

  // Engagement (runs every 4 hours)
  engage: async () => {
    console.log('🔍 Searching for engagement opportunities...');
    await searchAndEngage();
  },
};
