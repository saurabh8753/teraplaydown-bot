const { Telegraf, Markup } = require('telegraf');

// Bot initialization
const bot = new Telegraf(process.env.BOT_TOKEN);

// Start command
bot.start((ctx) => {
  ctx.reply(
    '💌 Welcome to Desitera bot!\n\nSend me any Terabox link and I will give you Play & Download link 🔗'
  );
});

// Text handler
bot.on('text', async (ctx) => {
  const userLink = ctx.message.text;

  if (
    userLink.includes('terabox') ||
    userLink.includes('terashare') ||
    userLink.includes('nephobox')
  ) {
    const domain = 'teraplaydown.vercel.app';

    const landingPageUrl =
      `https://${domain}/index.html?link=` +
      encodeURIComponent(userLink);

    await ctx.reply(
      '📥 Aapki File Ready Hai!',
      Markup.inlineKeyboard([
        [Markup.button.url('▶️ Play & Download', landingPageUrl)]
      ])
    );
  } else {
    await ctx.reply('❌ Please send a valid Terabox link.');
  }
});

// Vercel serverless handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body);
      return res.status(200).json({ ok: true });
    }

    res.status(200).send('🤖 Desitera Bot is running');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Error');
  }
};
