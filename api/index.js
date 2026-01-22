const { Telegraf, Markup } = require("telegraf");
const { MongoClient } = require("mongodb");

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = Number(process.env.ADMIN_ID);
const MONGO_URI = process.env.MONGODB_URI;

let db;
async function getDB() {
  if (db) return db;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db("teraplaydown");
  return db;
}

async function saveUser(ctx) {
  const db = await getDB();
  await db.collection("users").updateOne(
    { userId: ctx.from.id },
    {
      $set: {
        userId: ctx.from.id,
        username: ctx.from.username || "",
        lastSeen: new Date()
      }
    },
    { upsert: true }
  );
}

bot.start(async (ctx) => {
  await saveUser(ctx);
  ctx.reply("💌 Welcome to Desitera_bot\nSend any Terabox link.");
});

bot.on("text", async (ctx) => {
  await saveUser(ctx);
  const text = ctx.message.text.trim();
  const db = await getDB();

  // ===== ADMIN COMMANDS =====
  if (ctx.from.id === ADMIN_ID) {
    if (text === "/stats") {
      const total = await db.collection("users").countDocuments();
      const active = await db.collection("users").countDocuments({
        lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });
      return ctx.reply(`📊bot stats\nTotal Users: ${total}\n⚡ Active (24h): ${active}`);
    }

    if (text.startsWith("/broadcast")) {
      const msg = text.replace("/broadcast", "").trim();
      if (!msg) return ctx.reply("❌ Message missing");

      const users = await db.collection("users").find().toArray();
      let sent = 0;

      for (const u of users) {
        try {
          await bot.telegram.sendMessage(u.userId, msg);
          sent++;
        } catch {}
      }
      return ctx.reply(`📢 Broadcast sent to ${sent} users`);
    }
  }

  // ===== USER LINK =====
  if (
    text.includes("terabox") ||
    text.includes("terashare") ||
    text.includes("nephobox")
  ) {
    const url =
      "https://teraplaydown-site.vercel.app/?link=" +
      encodeURIComponent(text);

    const msg = await ctx.reply(
      "📥 Aapki File Ready hai ⚡",
      Markup.inlineKeyboard([
        Markup.button.url("▶️ Play & Download", url)
      ])
    );

    // 🔥 auto-delete register (NO NOTE MESSAGE)
    await db.collection("auto_delete").insertOne({
      chatId: ctx.chat.id,
      messageId: msg.message_id,
      deleteAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return;
  }

  ctx.reply("❌ Send a valid Terabox link");
});

module.exports = async (req, res) => {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  }
  res.status(200).send("Bot running");
};
