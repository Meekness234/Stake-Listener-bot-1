const fetch = require('node-fetch');

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const POLL_MS = 20000;

let lastSeenId = null;

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

async function fetchRealGames() {
  try {
    const res = await fetch('https://stake.com/api/v2/crash/games?limit=10', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://stake.com',
        'Referer': 'https://stake.com/casino/games/crash'
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.data?.games?.length) {
        return data.data.games.map(g => ({
          id: g.id,
          crashpoint: g.crashPoint / 100,
          startTime: new Date(g.createdAt).toISOString()
        }));
      }
    } else {
      console.log(`Main API HTTP ${res.status}`);
    }
  } catch (e) {
    console.log("Main API error:", e.message);
  }
  return [];
}

async function checkNewGames() {
  console.log("🔍 Checking for new Stake games...");
  const games = await fetchRealGames();
  if (!games.length) {
    console.log("⚠️ No live data – will retry later");
    return;
  }
  const sorted = [...games].sort((a, b) => b.id - a.id);
  for (const game of sorted) {
    if (!lastSeenId || game.id > lastSeenId) {
      const mult = parseFloat(game.crashpoint).toFixed(2);
      const msg = `🎲 *Round #${game.id}*\n🚀 ${mult}x\n🕒 ${new Date(game.startTime).toLocaleTimeString()}`;
      await sendTelegram(msg);
      console.log(`✅ Sent #${game.id} - ${mult}x`);
      lastSeenId = game.id;
    }
  }
}

async function start() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("Missing BOT_TOKEN or CHAT_ID env vars");
    return;
  }
  console.log("🤖 Live Stake Bot starting...");
  await sendTelegram("✅ Bot is online and running on Render!");
  await checkNewGames();
  setInterval(checkNewGames, POLL_MS);
}

start().catch(console.error);
