/**
 * Crowd-Sourced FAQ — Express Backend
 * Primary AI: xAI Grok  |  NLP service: Python sentence-transformers
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Config ────────────────────────────────────────────────────────────────────
const PORT               = process.env.PORT               || 5000;
const NLP_SERVICE_URL    = process.env.NLP_SERVICE_URL    || 'http://localhost:8000';
const GROK_API_KEY       = process.env.GROK_API_KEY       || '';
const GROK_MODEL         = process.env.GROK_MODEL         || 'grok-3';
const GROK_TEMPERATURE   = parseFloat(process.env.GROK_TEMPERATURE || '0.7');
const SIM_THRESHOLD      = parseFloat(process.env.SIMILARITY_THRESHOLD || '0.85');
const GROK_API_URL       = 'https://api.x.ai/v1/chat/completions';

// ── SQLite ────────────────────────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) { console.error('DB connection error:', err.message); return; }
  console.log('Connected to SQLite at:', dbPath);
  initializeTables();
});

// ─────────────────────────────────────────────────────────────────────────────
//  Grok AI helper
// ─────────────────────────────────────────────────────────────────────────────
async function callGrok(systemPrompt, userMessage) {
  if (!GROK_API_KEY) {
    console.warn('[Grok] GROK_API_KEY not set.');
    return null;
  }
  try {
    const resp = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  }
        ],
        temperature: GROK_TEMPERATURE,
        max_tokens:  512
      }),
      signal: AbortSignal.timeout(20000)
    });
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[Grok] HTTP ${resp.status}: ${errText}`);
      return null;
    }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[Grok] Request failed:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Template fallback (no API key / network error)
// ─────────────────────────────────────────────────────────────────────────────
function templateAnswer(questionText, category) {
  const q = questionText.toLowerCase();
  if (/password|reset|login|credential/.test(q))
    return `To reset your credentials in the ${category} module, click 'Forgot Password' on the login page, enter your account email, and follow the link sent to your inbox.`;
  if (/invoice|bill|receipt|payment|charge/.test(q))
    return `You can find your receipts under Settings → Invoices. Select the billing period and click 'Download PDF'.`;
  if (/policy|guideline|rule|terms|advertis/.test(q))
    return `Community standards require all posts to be polite and professional. Content violating these rules will be removed by moderators.`;
  return `For questions regarding ${category}, please visit our documentation portal, verify your credentials, or contact support for personalised assistance.`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Generate AI draft — Grok first, template fallback
// ─────────────────────────────────────────────────────────────────────────────
async function generateAIDraft(questionText, category, customPrompt = '') {
  const system = [
    `You are an expert technical support assistant for the '${category}' category.`,
    `Provide a concise, step-by-step answer that is professional and easy to follow.`,
    customPrompt ? `Additional instructions: ${customPrompt}` : ''
  ].filter(Boolean).join('\n');

  const answer = await callGrok(system, questionText);
  if (answer) {
    console.log(`[AI Draft] Generated via ${GROK_MODEL}`);
    return answer;
  }
  console.warn('[AI Draft] Grok unavailable, using template fallback.');
  return templateAnswer(questionText, category);
}

// ─────────────────────────────────────────────────────────────────────────────
//  NLP Service — semantic deduplication
//  Falls back to JS cosine similarity when Python service is offline
// ─────────────────────────────────────────────────────────────────────────────
async function nlpCluster(questionText, clusters) {
  try {
    const resp = await fetch(`${NLP_SERVICE_URL}/nlp/cluster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_text: questionText, clusters }),
      signal: AbortSignal.timeout(8000)
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.json();   // { cluster_id, similarity }
  } catch (err) {
    console.warn(`[NLP Service] Unavailable (${err.message}) — using JS fallback.`);
    return null;
  }
}

// Startup health check (non-blocking)
setTimeout(async () => {
  try {
    const r = await fetch(`${NLP_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (r.ok) {
      const d = await r.json();
      console.log(`[NLP Service] Connected ✓  model=${d.model}  ai=${d.ai}  threshold=${d.threshold}`);
    }
  } catch {
    console.warn('[NLP Service] Not reachable at startup — will retry per-request.');
  }
}, 2000);

// ─────────────────────────────────────────────────────────────────────────────
//  JS cosine similarity fallback
// ─────────────────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
  'the','a','an','is','are','to','for','in','on','at',
  'my','how','what','where','why','do','i','can','reset','forgot'
]);

function tokenize(text) {
  return (text.toLowerCase().match(/\w+/g) || []).filter(w => !STOP_WORDS.has(w));
}

function jsCosine(text1, text2) {
  const t1 = tokenize(text1);
  const t2 = tokenize(text2);
  if (!t1.length || !t2.length) {
    const s1 = new Set(text1.toLowerCase().split(/\s+/));
    const s2 = new Set(text2.toLowerCase().split(/\s+/));
    const inter = [...s1].filter(w => s2.has(w)).length;
    const union = new Set([...s1, ...s2]).size;
    return union ? inter / union : 0;
  }
  const vocab = new Set([...t1, ...t2]);
  let dot = 0, sq1 = 0, sq2 = 0;
  for (const w of vocab) {
    const f1 = t1.filter(x => x === w).length;
    const f2 = t2.filter(x => x === w).length;
    dot += f1 * f2; sq1 += f1 * f1; sq2 += f2 * f2;
  }
  const mag = Math.sqrt(sq1) * Math.sqrt(sq2);
  return mag ? dot / mag : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Priority score  (recency-decay formula)
// ─────────────────────────────────────────────────────────────────────────────
function priorityScore(upvotes, createdAt) {
  const hours = Math.max(0, (Date.now() - new Date(createdAt)) / 3_600_000);
  return parseFloat(((upvotes + 1) / Math.sqrt(hours + 2)).toFixed(3));
}

function refreshPriorityScores(cb) {
  db.all("SELECT id, upvotes, created_at FROM CLUSTERS WHERE status='unanswered'", (err, rows) => {
    if (err) return cb(err);
    if (!rows.length) return cb(null);
    let done = 0;
    rows.forEach(r => {
      db.run('UPDATE CLUSTERS SET priority_score=? WHERE id=?',
        [priorityScore(r.upvotes, r.created_at), r.id],
        () => { if (++done === rows.length) cb(null); }
      );
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Database initialisation & seed
// ─────────────────────────────────────────────────────────────────────────────
function initializeTables() {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    db.run(`CREATE TABLE IF NOT EXISTS CLUSTERS (
      id TEXT PRIMARY KEY,
      representative_question TEXT NOT NULL,
      category TEXT NOT NULL,
      upvotes INTEGER DEFAULT 0,
      priority_score REAL DEFAULT 0.0,
      status TEXT DEFAULT 'unanswered',
      created_at TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS QUESTIONS (
      id TEXT PRIMARY KEY,
      question_text TEXT NOT NULL,
      category TEXT NOT NULL,
      cluster_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS VOTES (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE,
      UNIQUE(cluster_id, user_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ANSWERS (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      answer_text TEXT NOT NULL,
      author_type TEXT NOT NULL,
      user_id TEXT,
      upvotes INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS PUBLISHED_FAQ (
      id TEXT PRIMARY KEY,
      cluster_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT NOT NULL,
      published_at TEXT NOT NULL
    )`);

    db.get('SELECT COUNT(*) as count FROM CLUSTERS', (err, row) => {
      if (!err && row.count === 0) {
        console.log('[DB] Seeding initial clusters…');
        seedData();
      }
    });
  });
}

function seedData() {
  const now = new Date().toISOString();
  const seed = [
    {
      id: 'cluster_1001',
      q:  'How can I change my registered email address?',
      cat: 'Account Security',
      ans: 'To change your email, log in → Settings → Profile Settings → Edit Email. Enter the new address and click Save. A verification link will be sent to confirm.',
      upvotes: 3
    },
    {
      id: 'cluster_1002',
      q:  'How do I download monthly PDF invoices?',
      cat: 'Billing',
      ans: 'Go to Settings → Invoices, select the billing period, then click Download PDF.',
      upvotes: 1
    }
  ];
  seed.forEach(s => {
    db.run('INSERT INTO CLUSTERS VALUES (?,?,?,?,2.5,"unanswered",?)',
      [s.id, s.q, s.cat, s.upvotes, now]);
    db.run('INSERT INTO QUESTIONS VALUES (?,?,?,?,?,?)',
      [`q_${s.id}`, s.q, s.cat, s.id, 'seed_user', now]);
    db.run('INSERT INTO ANSWERS VALUES (?,?,?,"ai",NULL,0,?)',
      [`ans_${s.id}_ai`, s.id, s.ans, now]);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
//  Routes
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/questions  — submit a question (Stage 1 & 2)
app.post('/api/questions', async (req, res) => {
  const { question_text, category, user_id, custom_prompt } = req.body;
  if (!question_text?.trim() || !category?.trim())
    return res.status(400).json({ success: false, error: 'question_text and category are required.' });

  const userId = user_id || 'user_anon';
  const now    = new Date().toISOString();

  db.all("SELECT id, representative_question FROM CLUSTERS WHERE status='unanswered'",
    async (err, clusters) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      let matchedId  = null;
      let matchedSim = 0;

      // 1. Try NLP service (sentence-transformers)
      const nlpResult = await nlpCluster(question_text, clusters);
      if (nlpResult) {
        if (nlpResult.cluster_id !== 'new') {
          matchedId  = nlpResult.cluster_id;
          matchedSim = nlpResult.similarity;
          console.log(`[NLP] Matched ${matchedId} (sim=${matchedSim})`);
        } else {
          matchedSim = nlpResult.similarity;
        }
      } else {
        // 2. JS fallback
        clusters.forEach(c => {
          const s = jsCosine(question_text, c.representative_question);
          if (s > matchedSim) { matchedSim = s; matchedId = c.id; }
        });
        if (matchedSim < SIM_THRESHOLD) matchedId = null;
      }

      const qId = `q_${Date.now()}${Math.floor(Math.random() * 1000)}`;

      if (matchedId && matchedSim >= SIM_THRESHOLD) {
        // Merge into existing cluster
        db.run('INSERT INTO QUESTIONS VALUES (?,?,?,?,?,?)',
          [qId, question_text, category, matchedId, userId, now],
          err => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            refreshPriorityScores(() =>
              res.status(200).json({
                success: true,
                message: 'Question merged into an existing cluster.',
                cluster_id: matchedId, is_new: false,
                similarity: parseFloat(matchedSim.toFixed(3))
              })
            );
          }
        );
      } else {
        // New cluster — generate Grok draft
        const cId   = `cluster_${Date.now()}${Math.floor(Math.random() * 100)}`;
        const draft = await generateAIDraft(question_text, category, custom_prompt || '');

        db.serialize(() => {
          db.run('INSERT INTO CLUSTERS VALUES (?,?,?,0,0.5,"unanswered",?)',
            [cId, question_text, category, now]);
          db.run('INSERT INTO QUESTIONS VALUES (?,?,?,?,?,?)',
            [qId, question_text, category, cId, userId, now]);
          db.run('INSERT INTO ANSWERS VALUES (?,?,?,"ai",NULL,0,?)',
            [`ans_${cId}_ai`, cId, draft, now],
            err => {
              if (err) return res.status(500).json({ success: false, error: err.message });
              refreshPriorityScores(() =>
                res.status(201).json({
                  success: true,
                  message: 'New cluster created with Grok-generated draft answer.',
                  cluster_id: cId, is_new: true,
                  similarity: parseFloat(matchedSim.toFixed(3))
                })
              );
            }
          );
        });
      }
    }
  );
});

// GET /api/questions  — list unanswered clusters sorted by priority (Stage 3)
app.get('/api/questions', (req, res) => {
  refreshPriorityScores(err => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    db.all(
      `SELECT id, representative_question, category, upvotes, priority_score, status, created_at
       FROM CLUSTERS WHERE status='unanswered' ORDER BY priority_score DESC`,
      (err, rows) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json(rows);
      }
    );
  });
});

// POST /api/votes  — upvote a cluster (Stage 3)
app.post('/api/votes', (req, res) => {
  const { cluster_id, user_id } = req.body;
  if (!cluster_id || !user_id)
    return res.status(400).json({ success: false, error: 'cluster_id and user_id are required.' });

  const voteId = `v_${Date.now()}`;
  db.run('INSERT INTO VOTES VALUES (?,?,?,?)',
    [voteId, cluster_id, user_id, new Date().toISOString()],
    err => {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed'))
          return res.status(400).json({ success: false, error: 'Already upvoted.' });
        return res.status(500).json({ success: false, error: err.message });
      }
      db.run('UPDATE CLUSTERS SET upvotes=upvotes+1 WHERE id=?', [cluster_id], () => {
        refreshPriorityScores(() => {
          db.get('SELECT upvotes, priority_score FROM CLUSTERS WHERE id=?', [cluster_id],
            (err, row) => res.json({
              success: true, cluster_id,
              new_upvote_count: row.upvotes,
              new_priority_score: row.priority_score
            })
          );
        });
      });
    }
  );
});

// GET /api/moderation/unanswered  — moderation queue (Stage 5)
app.get('/api/moderation/unanswered', (req, res) => {
  refreshPriorityScores(() => {
    db.all(`
      SELECT c.id, c.representative_question, c.category, c.upvotes, c.priority_score,
             a.answer_text as ai_draft_answer
      FROM CLUSTERS c
      LEFT JOIN ANSWERS a ON c.id=a.cluster_id AND a.author_type='ai'
      WHERE c.status='unanswered'
      ORDER BY c.priority_score DESC
    `, (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json(rows);
    });
  });
});

// POST /api/moderation/approve  — approve & publish (Stage 5 & 6)
app.post('/api/moderation/approve', (req, res) => {
  const { cluster_id, approved_answer } = req.body;
  if (!cluster_id || !approved_answer?.trim())
    return res.status(400).json({ success: false, error: 'cluster_id and approved_answer are required.' });

  db.get('SELECT representative_question, category FROM CLUSTERS WHERE id=?', [cluster_id],
    (err, cluster) => {
      if (err || !cluster)
        return res.status(404).json({ success: false, error: 'Cluster not found.' });

      const faqId = `faq_${Date.now()}`;
      const now   = new Date().toISOString();
      db.serialize(() => {
        db.run('INSERT INTO PUBLISHED_FAQ VALUES (?,?,?,?,?,?)',
          [faqId, cluster_id, cluster.representative_question, approved_answer, cluster.category, now]);
        db.run("UPDATE CLUSTERS SET status='answered' WHERE id=?", [cluster_id], err => {
          if (err) return res.status(500).json({ success: false, error: err.message });
          res.json({ success: true, message: 'Published to FAQ.', faq_id: faqId });
        });
      });
    }
  );
});

// GET /api/faq  — public FAQ search (Stage 6)
app.get('/api/faq', (req, res) => {
  const { search, category } = req.query;
  let q = 'SELECT id as faq_id, question, answer, category, published_at FROM PUBLISHED_FAQ WHERE 1=1';
  const p = [];
  if (category) { q += ' AND category=?'; p.push(category); }
  if (search)   { q += ' AND (question LIKE ? OR answer LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
  q += ' ORDER BY published_at DESC';
  db.all(q, p, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

// POST /api/chat  — conversational FAQ assistant (Stage 6)
// First tries FAQ DB similarity match, then forwards to Grok if no match
app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message is required.' });

  db.all('SELECT faq_id, question, answer, category FROM (SELECT id as faq_id, question, answer, category FROM PUBLISHED_FAQ)',
    async (err, faqs) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      // Try local FAQ match first
      let bestSim = 0, bestFaq = null;
      faqs.forEach(f => {
        const s = jsCosine(message, f.question);
        if (s > bestSim) { bestSim = s; bestFaq = f; }
      });

      if (bestFaq && bestSim > 0.35) {
        return res.json({
          success: true,
          answer: bestFaq.answer,
          matched_question: bestFaq.question,
          similarity: parseFloat(bestSim.toFixed(3)),
          provider: 'faq-db'
        });
      }

      // Fall back to Grok with FAQ context
      const faqContext = faqs.slice(0, 10)
        .map(f => `Q: ${f.question}\nA: ${f.answer}`)
        .join('\n\n');

      const system = [
        'You are a helpful FAQ assistant. Answer the user question concisely.',
        faqContext ? `Use this FAQ knowledge base as your primary source:\n${faqContext}` : ''
      ].filter(Boolean).join('\n\n');

      const answer = await callGrok(system, message);
      if (answer) {
        return res.json({ success: true, answer, provider: GROK_MODEL });
      }

      res.json({
        success: false,
        answer: "I couldn't find a verified answer. Would you like to submit this to our community queue?",
        provider: 'template-fallback'
      });
    }
  );
});

// GET /api/nlp/health  — NLP service health proxy
app.get('/api/nlp/health', async (req, res) => {
  try {
    const r = await fetch(`${NLP_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    res.json({ ...(await r.json()), nlp_url: NLP_SERVICE_URL });
  } catch {
    res.status(503).json({ status: 'offline', nlp_url: NLP_SERVICE_URL });
  }
});

// POST /api/git-sync  — push to remote
app.post('/api/git-sync', (req, res) => {
  const { exec } = require('child_process');
  exec('git push origin main', (err, stdout, stderr) => {
    if (err)
      return res.status(500).json({ success: false, message: 'Git sync failed.', details: stderr || err.message });
    res.json({ success: true, message: 'Synced with remote repository.', details: stdout });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Express API  →  http://localhost:${PORT}`);
  console.log(`🤖  AI Provider  →  ${GROK_MODEL} (xAI Grok)`);
  console.log(`🧠  NLP Service  →  ${NLP_SERVICE_URL}\n`);
});
