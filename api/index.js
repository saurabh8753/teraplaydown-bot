const { Telegraf, Markup } = require("telegraf");
const { MongoClient } = require("mongodb");

// ===== CONFIG =====
const BOT_USERNAME = "desitera_bot"; // @ ke bina
const ADMIN_ID = Number(process.env.ADMIN_ID);
const MONGO_URI = process.env.MONGODB_URI;

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== DB CONNECTION =====
let db;
async function getDB() {
  if (db) return db;
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db("teraplaydown");
  return db;
}

// ===== SAVE USER =====
async function saveUser(ctx) {
  const db = await getDB();
  await db.collection("users").updateOne(
    { userId: ctx.from.id },
    {
      $set: {
        userId: ctx.from.id,
        username: ctx.from.username || "",
        firstName: ctx.from.first_name || "",
        lastSeen: new Date()
      }
    },
    { upsert: true }
  );
}

// ===== START =====
bot.start(async (ctx) => {
  await saveUser(ctx);
  ctx.reply(
    "💌 Welcome to Desitera Bot!\n\nSend any Terabox / Terashare / Nephobox link."
  );
});

// ===== TEXT HANDLER =====
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

      return ctx.reply(
        `📊 Bot Stats\n\n👥 Total Users: ${total}\n⚡ Active (24h): ${active}`
      );
    }

    if (text.startsWith("/broadcast")) {
      const msg = text.replace("/broadcast", "").trim();
      if (!msg) return ctx.reply("❌ Broadcast message missing");

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

  // ===== USER LINK FLOW =====
  if (
    text.includes("terabox") ||
    text.includes("terashare") ||
    text.includes("nephobox")
  ) {
    const playUrl =
      "https://teraplaydown-site.vercel.app/?link=" +
      encodeURIComponent(text);

    const msg = await ctx.reply(
      "📥 File Ready!",
      Markup.inlineKeyboard([
        [
          Markup.button.url("▶️ Play & Download", playUrl)
        ],
        [
          Markup.button.url(
            "📤 Share Bot",
            `https://t.me/share/url?url=https://t.me/${BOT_USERNAME}&text=🔥 Terabox videos easily download karo!\n\n👉 https://t.me/${BOT_USERNAME}`
          )
        ]
      ])
    );

    // ===== AUTO DELETE REGISTER (5 MIN) =====
    await db.collection("auto_delete").insertOne({
      chatId: ctx.chat.id,
      messageId: msg.message_id,
      deleteAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    return;
  }

  ctx.reply("❌ Please send a valid Terabox link");
});

// ===== VERCEL HANDLER =====
module.exports = async (req, res) => {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  }
  res.status(200).send("Bot running");
};
