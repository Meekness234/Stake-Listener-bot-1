const fetch = require('node-fetch');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const POLL_MS = 20000;

let lastMultiplier = null;

async function sendTelegram(text) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text })
  });
  if (!res.ok) throw new Error(`Telegram error: ${res.status}`);
  return true;
}

async function fetchCurrentMultiplier() {
  try {
    const res = await fetch('https://edgegpt.bot/crash');
    const html = await res.text();
    // Find the multiplier inside <div class="text-rose-500">X.XXx</div>
    const match = html.match(/<div class="text-rose-500">(\d+\.\d+)x<\/div>/);
    if (match) {
      const multiplier = parseFloat(match[1]);
      console.log(`📊 Scraped multiplier: ${multiplier}x`);
      return multiplier;
    } else {
      console.log("⚠️ Multiplier pattern not found in HTML");
    }
  } catch (e) {
    console.log("Scraping error:", e.message);
  }
  return null;
}

async function checkNewGame() {
  console.log("🔍 Checking edgegpt.bot/crash...");
  const currentMultiplier = await fetchCurrentMultiplier();
  if (currentMultiplier === null) {
    console.log("⚠️ Could not fetch multiplier – retrying later");
    return;
  }

  // If multiplier changed (or first run), send update
  if (lastMultiplier !== currentMultiplier) {
    const timestamp = new Date().toLocaleTimeString();
    const msg = `🎲 *Stake Crash Update*\n🚀 Multiplier: ${currentMultiplier}x\n🕒 ${timestamp}`;
    await sendTelegram(msg);
    console.log(`✅ Sent new multiplier: ${currentMultiplier}x`);
    lastMultiplier = currentMultiplier;
  } else {
    console.log(`⏳ No change – still ${currentMultiplier}x`);
  }
}

async function start() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("❌ Missing BOT_TOKEN or CHAT_ID environment variables");
    return;
  }
  console.log("🤖 Stake Crash Bot (scraping mode) starting...");
  await sendTelegram("✅ Bot is online! Scraping edgegpt.bot/crash for live multipliers.");
  await checkNewGame();
  setInterval(checkNewGame, POLL_MS);
}

start().catch(console.error);
