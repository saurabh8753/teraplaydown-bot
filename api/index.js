const { Telegraf, Markup } = require('telegraf');

// Initialize bot (BOT_TOKEN must be in Vercel Env)
const bot = new Telegraf(process.env.BOT_TOKEN);

// /start command
bot.start((ctx) => {
  ctx.reply(
    '💌 Welcome to Desitera Bot!\n\n' +
    'Send me any Terabox / Terashare / Nephobox link and I will give you Play & Download button 🔗'
  );
});

// Handle text messages
bot.on('text', async (ctx) => {
  const userLink = (ctx.message.text || '').trim();

  // Basic validation
  if (
    userLink.includes('terabox') ||
    userLink.includes('terashare') ||
    userLink.includes('nephobox')
  ) {
    // ✅ Use ROOT URL (no /index.html to avoid 404)
    const domain = 'teraplaydown.vercel.app';
    const landingPageUrl =
      `https://${domain}/?link=` + encodeURIComponent(userLink);

    try {
      await ctx.reply(
        '📥 Aapki File Ready Hai!',
        Markup.inlineKeyboard([
          [Markup.button.url('▶️ Play & Download', landingPageUrl)]
        ])
      );
    } catch (e) {
      console.error('Reply error:', e);
    }
  } else {
    await ctx.reply('❌ Please send a valid Terabox link.');
  }
});

// Vercel Serverless Function handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    }

    // Health check (browser open)
    res
      .status(200)
      .send('🤖 Desitera Bot is running successfully');
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).send('Internal Server Error');
  }
};
