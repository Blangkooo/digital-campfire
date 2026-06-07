'use strict';

const express  = require('express');
const cron     = require('node-cron');
const cors     = require('cors');
const path     = require('path');
const crypto   = require('crypto');
const { Pool } = require('pg');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Database (Render PostgreSQL via DATABASE_URL env var) ────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id          TEXT    PRIMARY KEY,
      text        TEXT    NOT NULL,
      category    TEXT    NOT NULL,
      alias       TEXT    NOT NULL,
      created_at  BIGINT  NOT NULL,
      is_auto     BOOLEAN NOT NULL DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS daily_log (
      date TEXT PRIMARY KEY
    );
  `);
}

// ─── Campfire alias generator ─────────────────────────────────────────────────
const ALIAS_WORDS = [
  'Stargazer','Nightwind','Ember','Moonwhisper','Driftwood',
  'Ashwood','Cinder','Foxfire','Wanderer','Stoneheart',
  'Ravenbrook','Willowmere','Snowdrift','Ironbark','Mistfall',
  'Thornwood','Goldenleaf','Silversong','Dawncrest','Frostmere',
  'Hollowbrook','Thistledown','Cinderpath','Stormwatch','Palefire',
  'Inkblot','Copperleaf','Saltwind','Tidewatcher','Hearthside',
  'Brightmere','Duskwalker','Coalfire','Willowsong','Nightmere',
];

function randomAlias() {
  const word = ALIAS_WORDS[Math.floor(Math.random() * ALIAS_WORDS.length)];
  const num  = Math.floor(Math.random() * 900) + 100;
  return `${word}${num}`;
}

// ─── Auto-message pool (60 messages across all categories) ───────────────────
const AUTO_POOL = [
  // ADVICE
  { text: "The kindest thing you can do for yourself is stop apologizing for things that were never your fault.",              category: "Advice" },
  { text: "Write down what you're grateful for before you check your phone in the morning. Two weeks and it rewires you.",     category: "Advice" },
  { text: "Let people finish their sentences. Most arguments dissolve when someone finally feels heard.",                      category: "Advice" },
  { text: "Stop trying to be the person you think everyone needs. Just be the person you needed at thirteen.",                 category: "Advice" },
  { text: "Rest is not a reward for finishing everything. It's part of how you finish everything.",                            category: "Advice" },
  { text: "If you're waiting for permission to start — this is it. This is your permission.",                                  category: "Advice" },
  { text: "Say no to things that cost you more than they give you, even when they're free.",                                   category: "Advice" },
  { text: "The right people will still be there after you say no. Keep that in mind.",                                         category: "Advice" },
  { text: "Forgive yourself for who you were when you were surviving. That person kept you alive.",                            category: "Advice" },
  { text: "Your future self is watching. Do something today that they'll be quietly proud of.",                                category: "Advice" },
  // CONFESSION
  { text: "I still keep every birthday card I've ever received in a shoebox under my bed. I reread them when I feel invisible.", category: "Confession" },
  { text: "I drove past my childhood home last summer and sat outside for forty minutes. I never got out of the car.",           category: "Confession" },
  { text: "I pretend to be busier than I am because I'm afraid of how empty the silence feels.",                                category: "Confession" },
  { text: "I talk to my dog like she understands every word — and I think she might.",                                          category: "Confession" },
  { text: "I have a playlist called 'cry it out' that I listen to alone in the car. It helps more than anything else.",         category: "Confession" },
  { text: "I've rehearsed hard conversations in the mirror for years. I still freeze when the moment actually comes.",           category: "Confession" },
  { text: "I miss someone I'm not allowed to miss anymore. I don't know what to do with that.",                                  category: "Confession" },
  { text: "I've been writing a letter to my younger self for three years. I still can't finish it.",                             category: "Confession" },
  // DREAM
  { text: "I want to spend a whole winter in a cabin with nothing but books, a fire, and no wifi. No apologies for it.",       category: "Dream" },
  { text: "My dream is to open a small library café where the coffee is cheap and you can stay all day.",                      category: "Dream" },
  { text: "I want to drive across the country with no itinerary. Just stop whenever something looks interesting.",             category: "Dream" },
  { text: "I dream about waking up with nowhere I have to be and calling that freedom instead of failure.",                    category: "Dream" },
  { text: "I want to learn to make bread the slow way, with my hands, in a kitchen that smells like Sunday morning.",         category: "Dream" },
  { text: "My dream is to live somewhere where I can hear crickets at night and wake up to birds. Nothing else.",              category: "Dream" },
  { text: "I want to write a book that one stranger reads on a rainy afternoon and feels less alone.",                         category: "Dream" },
  { text: "I dream of a life where I can say 'I don't know' without it feeling like failure.",                                 category: "Dream" },
  // MEMORY
  { text: "My grandmother's kitchen smelled like cardamom and burnt sugar. Twenty years later and it still undoes me.",             category: "Memory" },
  { text: "The summer I turned sixteen, my best friend and I slept on his roof and named every star badly.",                        category: "Memory" },
  { text: "I remember the exact moment I realized my parents were just people figuring it out. It broke and healed me at once.",    category: "Memory" },
  { text: "There was a tree I used to climb. The view from the top was the first place I ever felt like myself.",                   category: "Memory" },
  { text: "My dad's laugh was the loudest thing in any room. I catch myself trying to remember the exact sound.",                   category: "Memory" },
  { text: "I was nine when I read my first real book — stayed up until 3am thinking: so this is what it feels like to disappear somewhere good.", category: "Memory" },
  { text: "We had one summer with no plans and no money and it turned out to be the best one we ever had.",                         category: "Memory" },
  { text: "I still have the voicemail I can't bring myself to delete. Just knowing it's there is enough.",                          category: "Memory" },
  // STORY
  { text: "I got lost in a foreign city for six hours and found a bookshop, a stray cat, and a meal I'll spend the rest of my life trying to recreate.", category: "Story" },
  { text: "I quit my job on a Tuesday, started painting on Wednesday, and sold my first piece by Sunday. Terrifying. Worth it.",   category: "Story" },
  { text: "A stranger paid for my coffee when I was counting coins at the counter. I've been paying it forward for eleven years.", category: "Story" },
  { text: "I wrote my grandmother a letter every month for four years. She passed before I ran out of things to say.",             category: "Story" },
  { text: "We were supposed to break up that night. Instead we drove three hours to the coast and watched the sun rise. That was twelve years ago.", category: "Story" },
  { text: "I failed the exam, lost the apartment, and missed the flight all in one week. It was the beginning of the best chapter of my life.", category: "Story" },
  { text: "My neighbor is 84 and teaches me chess on Thursdays. She always wins. I think that is the lesson.",                    category: "Story" },
  { text: "I planted a garden during the worst year of my life. Something small and alive needed me to keep going.",               category: "Story" },
  // GRATITUDE
  { text: "Grateful for the friend who texts 'you okay?' at exactly the right moment, every time.",                             category: "Gratitude" },
  { text: "I'm grateful for rain on windows — the sound it makes, the permission it gives you to stay inside.",                 category: "Gratitude" },
  { text: "Grateful for the version of me that didn't give up on the hard years.",                                               category: "Gratitude" },
  { text: "I'm grateful for books that made me feel less alone when being a person was very difficult.",                         category: "Gratitude" },
  { text: "Grateful for the job that felt like a failure and turned out to be a doorway.",                                       category: "Gratitude" },
  { text: "I'm grateful for Sunday mornings with nothing scheduled and nowhere to be.",                                          category: "Gratitude" },
  { text: "Grateful for the one teacher who looked at me and saw something I couldn't see in myself yet.",                       category: "Gratitude" },
  { text: "I'm grateful for the long way home — for choosing the scenic route when I didn't have to.",                          category: "Gratitude" },
  // RANDOM THOUGHT
  { text: "Airports are the most honest places. Everyone is going somewhere and no one is pretending not to feel it.",           category: "Random Thought" },
  { text: "Old libraries smell like every thought someone ever had that was worth keeping.",                                     category: "Random Thought" },
  { text: "Somewhere right now someone is hearing their favourite song for the very first time.",                                category: "Random Thought" },
  { text: "We all carry a version of home inside us that no map could find.",                                                    category: "Random Thought" },
  { text: "The most honest conversations happen in cars. Something about not having to look at each other.",                     category: "Random Thought" },
  { text: "Stars are just suns that are far enough away to be beautiful without being blinding.",                                category: "Random Thought" },
  { text: "Nobody knows what they look like when they think no one's watching. That's probably the most real version of us.",   category: "Random Thought" },
  { text: "At some point the version of you that was afraid of this was right — and the current you went ahead anyway.",        category: "Random Thought" },
  { text: "There's a word for missing a place you've never been. I think about that a lot at night.",                           category: "Random Thought" },
  { text: "Every song was written by someone who needed to say something they couldn't say out loud.",                          category: "Random Thought" },
];

const SEEDS = [
  { text: "My grandmother used to say every sunset is a reminder that endings can be beautiful. I didn't understand until the year she left.", category: "Memory" },
  { text: "Advice from forty years of living: let people be wrong about you. Your peace is worth more than their accuracy.",                   category: "Advice" },
  { text: "I confess I still sleep with a stuffed animal. It's the one thing from my childhood I refused to outgrow.",                        category: "Confession" },
  { text: "I dream of a small house by the sea where no one knows my name — I wake to waves and go to sleep with stars.",                     category: "Dream" },
  { text: "I'm grateful for the 3am silence — that hour when the world stops pretending and lets you just exist.",                            category: "Gratitude" },
  { text: "There was a summer I spent entirely wrong — every bad decision — and it became the story I'm most proud to tell.",                 category: "Story" },
  { text: "Clouds are just the sky's way of practicing shapes it never commits to. I respect that.",                                          category: "Random Thought" },
];

// ─── Seed on first run ────────────────────────────────────────────────────────
async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*) AS n FROM messages');
  if (parseInt(rows[0].n) > 0) return;

  const now = Date.now();
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    await pool.query(
      'INSERT INTO messages (id, text, category, alias, created_at, is_auto) VALUES ($1,$2,$3,$4,$5,$6)',
      ['seed-' + crypto.randomUUID(), s.text, s.category, randomAlias(), now - (SEEDS.length - i) * 60000000, true]
    );
  }
  console.log('Seeded initial messages.');
}

// ─── Daily injection ──────────────────────────────────────────────────────────
async function injectDailyMessages() {
  const today = new Date().toISOString().slice(0, 10);
  const { rows: logged } = await pool.query('SELECT date FROM daily_log WHERE date = $1', [today]);
  if (logged.length > 0) return;

  const { rows: used } = await pool.query('SELECT text FROM messages WHERE is_auto = TRUE');
  const usedTexts = new Set(used.map(r => r.text));
  const available = AUTO_POOL.filter(m => !usedTexts.has(m.text));
  const picks     = available.sort(() => Math.random() - 0.5).slice(0, 3);
  const now       = Date.now();

  for (const pick of picks) {
    await pool.query(
      'INSERT INTO messages (id, text, category, alias, created_at, is_auto) VALUES ($1,$2,$3,$4,$5,$6)',
      ['auto-' + crypto.randomUUID(), pick.text, pick.category, randomAlias(), now, true]
    );
  }

  await pool.query('INSERT INTO daily_log (date) VALUES ($1) ON CONFLICT DO NOTHING', [today]);
  console.log(`[${today}] Injected ${picks.length} daily messages.`);
}

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '20kb' }));
app.use(express.static(path.join(__dirname)));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/messages', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, text, category, alias, created_at, is_auto FROM messages ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error.' });
  }
});

app.post('/api/messages', async (req, res) => {
  const { text, category } = req.body;

  if (!text || typeof text !== 'string' || text.trim().length === 0)
    return res.status(400).json({ error: 'Message text is required.' });

  const VALID = ['Advice','Confession','Dream','Memory','Story','Gratitude','Random Thought'];
  if (!VALID.includes(category))
    return res.status(400).json({ error: 'Invalid category.' });

  try {
    const id         = 'msg-' + crypto.randomUUID();
    const alias      = randomAlias();
    const created_at = Date.now();

    await pool.query(
      'INSERT INTO messages (id, text, category, alias, created_at, is_auto) VALUES ($1,$2,$3,$4,$5,$6)',
      [id, text.trim().slice(0, 500), category, alias, created_at, false]
    );

    res.status(201).json({ id, alias, created_at });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save message.' });
  }
});

// ─── Cron: midnight daily injection ──────────────────────────────────────────
cron.schedule('0 0 * * *', injectDailyMessages);

// ─── Boot ─────────────────────────────────────────────────────────────────────
async function start() {
  await initDB();
  await seedIfEmpty();
  await injectDailyMessages();
  app.listen(PORT, () => {
    console.log(`🔥 Digital Campfire → http://localhost:${PORT}`);
  });
}

start().catch(err => { console.error('Startup error:', err); process.exit(1); });
