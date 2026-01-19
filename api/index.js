const { Telegraf, Markup } = require("telegraf");
const { MongoClient } = require("mongodb");

const bot = new Telegraf(process.env.BOT_TOKEN);

// ENV
const MONGO_URI = process.env.MONGODB_URI;
const ADMIN_ID = Number(process.env.ADMIN_ID);

// Mongo client (global – reuse connection)
let client;
let usersCol;

async function connectDB() {
  if (usersCol) return usersCol;

  client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("teraplaydown");
  usersCol = db.collection("users");

  // index for fast lookup
  await usersCol.createIndex({ userId: 1 }, { unique: true });

  return usersCol;
}

// Save user helper
async function saveUser(ctx) {
  const users = await connectDB();
  const user = ctx.from;

  await users.updateOne(
    { userId: user.id },
    {
      $set: {
        userId: user.id,
        username: user.username || "",
        firstName: user.first_name || "",
        lastSeen: new Date()
      }
    },
    { upsert: true }
  );
}

// START
bot.start(async (ctx) => {
  await saveUser(ctx);

  ctx.reply(
    "💌 Welcome to Desitera Bot!\n\nSend any Terabox link to get Play & Download."
  );
});

// HANDLE LINKS
bot.on("text", async (ctx) => {
  await saveUser(ctx);

  const text = ctx.message.text.trim();

  // ADMIN COMMANDS
  if (text === "/stats" && ctx.from.id === ADMIN_ID) {
    const users = await connectDB();

    const total = await users.countDocuments();
    const active24h = await users.countDocuments({
      lastSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    return ctx.reply(
      `📊 Bot Stats\n\n👥 Total Users: ${total}\n⚡ Active (24h): ${active24h}`
    );
  }

  if (text.startsWith("/broadcast") && ctx.from.id === ADMIN_ID) {
    const msg = text.replace("/broadcast", "").trim();
    if (!msg) return ctx.reply("❌ Message missing");

    const users = await connectDB();
    const allUsers = await users.find().toArray();

    let sent = 0;
    for (const u of allUsers) {
      try {
        await bot.telegram.sendMessage(u.userId, msg);
        sent++;
      } catch (e) {}
    }

    return ctx.reply(`📢 Broadcast sent to ${sent} users`);
  }

  // NORMAL USER FLOW
  if (
    text.includes("terabox") ||
    text.includes("terashare") ||
    text.includes("nephobox")
  ) {
    const landingUrl =
      "https://teraplaydown-site.vercel.app/?link=" +
      encodeURIComponent(text);

    return ctx.reply(
      "📥 File Ready!",
      Markup.inlineKeyboard([
        Markup.button.url("▶️ Play & Download", landingUrl)
      ])
    );
  }

  ctx.reply("❌ Send a valid Terabox link");
});

// VERCEL HANDLER
module.exports = async (req, res) => {
  if (req.method === "POST") {
    await bot.handleUpdate(req.body);
    return res.status(200).json({ ok: true });
  }
  res.status(200).send("Bot running");
};
