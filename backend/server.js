require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
    initializeTables();
  }
});

function initializeTables() {
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = ON;");

    // 1. CLUSTERS TABLE
    db.run(`
      CREATE TABLE IF NOT EXISTS CLUSTERS (
        id TEXT PRIMARY KEY,
        representative_question TEXT NOT NULL,
        category TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        priority_score REAL DEFAULT 0.0,
        status TEXT DEFAULT 'unanswered',
        created_at TEXT NOT NULL
      )
    `);

    // 2. QUESTIONS TABLE
    db.run(`
      CREATE TABLE IF NOT EXISTS QUESTIONS (
        id TEXT PRIMARY KEY,
        question_text TEXT NOT NULL,
        category TEXT NOT NULL,
        cluster_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
      )
    `);

    // 3. VOTES TABLE
    db.run(`
      CREATE TABLE IF NOT EXISTS VOTES (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE,
        UNIQUE(cluster_id, user_id)
      )
    `);

    // 4. ANSWERS TABLE
    db.run(`
      CREATE TABLE IF NOT EXISTS ANSWERS (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        author_type TEXT NOT NULL,
        user_id TEXT,
        upvotes INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
      )
    `);

    // 5. PUBLISHED_FAQ TABLE
    db.run(`
      CREATE TABLE IF NOT EXISTS PUBLISHED_FAQ (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        published_at TEXT NOT NULL
      )
    `);

    // Insert Seed Data if database is completely empty
    db.get("SELECT COUNT(*) as count FROM CLUSTERS", (err, row) => {
      if (row && row.count === 0) {
        console.log('Seeding initial question clusters...');
        seedInitialData();
      }
    });
  });
}

function seedInitialData() {
  const now = new Date().toISOString();
  const c1 = "cluster_1001";
  const c2 = "cluster_1002";

  db.serialize(() => {
    db.run(`INSERT INTO CLUSTERS (id, representative_question, category, upvotes, priority_score, status, created_at) VALUES (?, ?, ?, 3, 2.5, 'unanswered', ?)`,
      [c1, "How can I change my registered email address?", "Account Security", now]);
    db.run(`INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ["q_101", "How can I change my registered email address?", "Account Security", c1, "user_101", now]);
    db.run(`INSERT INTO ANSWERS (id, cluster_id, answer_text, author_type, user_id, upvotes, created_at) VALUES (?, ?, ?, 'ai', NULL, 0, ?)`,
      ["ans_c1_ai", c1, "To change your email address, log in and head to settings -> Profile Settings -> Edit Email. Enter your new address and click save. A verification message will be delivered to your inbox.", now]);

    db.run(`INSERT INTO CLUSTERS (id, representative_question, category, upvotes, priority_score, status, created_at) VALUES (?, ?, ?, 1, 1.2, 'unanswered', ?)`,
      [c2, "How do I download monthly PDF invoices?", "Billing", now]);
    db.run(`INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      ["q_102", "How do I download monthly PDF invoices?", "Billing", c2, "user_102", now]);
    db.run(`INSERT INTO ANSWERS (id, cluster_id, answer_text, author_type, user_id, upvotes, created_at) VALUES (?, ?, ?, 'ai', NULL, 0, ?)`,
      ["ans_c2_ai", c2, "Invoices can be accessed under Settings -> Invoices. Select the billing date, review items, and click the Download PDF button.", now]);
  });
}

// =====================================================================
// Stage 2: Token-based Cosine Similarity Algorithmic Logic
// =====================================================================
const STOP_WORDS = new Set(["the", "a", "an", "is", "are", "to", "for", "in", "on", "at", "my", "how", "what", "where", "why", "do", "i", "can", "reset", "forgot"]);

function getTokens(text) {
  const words = text.toLowerCase().match(/\w+/g) || [];
  return words.filter(w => !STOP_WORDS.has(w));
}

function calculateCosineSimilarity(text1, text2) {
  const tokens1 = getTokens(text1);
  const tokens2 = getTokens(text2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return union.size ? intersection.size / union.size : 0.0;
  }

  const vocab = new Set([...tokens1, ...tokens2]);
  
  const vec1 = {};
  const vec2 = {};
  
  vocab.forEach(word => {
    vec1[word] = tokens1.filter(t => t === word).length;
    vec2[word] = tokens2.filter(t => t === word).length;
  });

  let dotProduct = 0;
  let sqSum1 = 0;
  let sqSum2 = 0;

  vocab.forEach(word => {
    dotProduct += vec1[word] * vec2[word];
    sqSum1 += vec1[word] * vec1[word];
    sqSum2 += vec2[word] * vec2[word];
  });

  const mag1 = Math.sqrt(sqSum1);
  const mag2 = Math.sqrt(sqSum2);

  if (mag1 === 0 || mag2 === 0) return 0.0;
  return dotProduct / (mag1 * mag2);
}

// =====================================================================
// Stage 3: Priority scoring formula
// =====================================================================
function getPriorityScore(upvotes, createdAtStr) {
  const createdAt = new Date(createdAtStr);
  const now = new Date();
  const deltaHours = Math.max(0.0, (now - createdAt) / 3600000.0);
  
  const score = (upvotes + 1.0) / Math.sqrt(deltaHours + 2.0);
  return parseFloat(score.toFixed(3));
}

function updatePriorityScores(callback) {
  db.all("SELECT id, upvotes, created_at FROM CLUSTERS WHERE status = 'unanswered'", (err, clusters) => {
    if (err) return callback(err);

    let completed = 0;
    if (clusters.length === 0) return callback(null);

    clusters.forEach(c => {
      const score = getPriorityScore(c.upvotes, c.created_at);
      db.run("UPDATE CLUSTERS SET priority_score = ? WHERE id = ?", [score, c.id], () => {
        completed++;
        if (completed === clusters.length) {
          callback(null);
        }
      });
    });
  });
}

// =====================================================================
// Stage 4: AI Template Generative Draft Drafts & API Integrations
// =====================================================================
function generateAIDraftAnswer(questionText, category) {
  const text = questionText.toLowerCase();
  if (text.includes("password") || text.includes("reset")) {
    return `To reset your credentials in the ${category} module, click the 'Forgot Password' link situated on the login prompt, key in your account email, and click submit. A password-reset verification key will be sent to your email immediately.`;
  } else if (text.includes("invoice") || text.includes("bill") || text.includes("receipt") || text.includes("payment")) {
    return `You can find your receipts under Settings -> Invoices. Choose the target billing interval and select the 'Download PDF' button to fetch the document directly. If payments fail, verify your card expiry dates.`;
  } else if (text.includes("guideline") || text.includes("policy") || text.includes("rule") || text.includes("terms")) {
    return `Community standards dictate that all member inputs be polite, non-advertising, and professional. Post submissions containing offensive content or unverified gossip will be flagged and purged by admins.`;
  } else {
    return `For questions regarding ${category}, please visit our documentation index, verify your user keys, or make sure your parameters align with the official configurations outlined in your team profile directory.`;
  }
}

async function generateAIDraftAnswerAsync(questionText, category, provider = 'gemini-1.5-flash') {
  console.log(`[AI Draft] Generating draft using provider: ${provider}`);
  const fallback = () => generateAIDraftAnswer(questionText, category);

  try {
    if (provider === 'gemini-1.5-flash' || provider === 'gemini' || !provider) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn('[AI Draft] GEMINI_API_KEY is not defined in env. Falling back.');
        return fallback();
      }
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert technical support assistant. Formulate a direct, step-by-step resolution for the user's question, keeping the instructions professional, precise, and category-aligned.
Category: ${category}
Question: ${questionText}
Draft Answer:`
            }]
          }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text.trim();
      } else {
        console.warn('[AI Draft] Gemini API returned unexpected format:', JSON.stringify(data));
        return fallback();
      }
    }

    if (provider === 'grok' || provider === 'grok-beta' || provider === 'claude-3-5-sonnet' || provider === 'deepseek-r1-distill' || provider === 'llama-3.1-70b-instruct') {
      const apiKey = process.env.GROK_API_KEY;
      if (!apiKey) {
        console.warn('[AI Draft] GROK_API_KEY is not defined in env. Falling back.');
        return fallback();
      }
      
      let modelName = 'grok-beta';
      if (provider === 'claude-3-5-sonnet') modelName = 'grok-2';
      if (provider === 'deepseek-r1-distill') modelName = 'grok-beta';
      if (provider === 'llama-3.1-70b-instruct') modelName = 'grok-beta';

      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `You are an expert technical support assistant for category ${category}. Formulate a direct, step-by-step resolution, keeping instructions professional and precise.`
            },
            {
              role: 'user',
              content: questionText
            }
          ],
          temperature: 0.7
        })
      });
      const data = await response.json();
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content.trim();
      } else {
        console.warn('[AI Draft] Grok API returned unexpected format:', JSON.stringify(data));
        return fallback();
      }
    }

    if (provider === 'huihui-qwen' || provider.includes('qwen') || provider.includes('huihui')) {
      const response = await fetch('https://api-inference.huggingface.co/models/huihui-ai/Huihui-Qwen3.6-35B-A3B-Claude-4.7-Opus-abliterated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputs: `Question about ${category}: ${questionText}\nDetailed Answer:`
        })
      });
      const data = await response.json();
      if (Array.isArray(data) && data[0] && data[0].generated_text) {
        return data[0].generated_text.trim();
      } else {
        console.warn('[AI Draft] HF Qwen Inference returned unexpected format:', JSON.stringify(data));
        return fallback();
      }
    }

    return fallback();
  } catch (err) {
    console.error('[AI Draft] API call failed with error:', err.message);
    return fallback();
  }
}

// =====================================================================
// REST API Endpoint Routing
// =====================================================================

// Submit Question (Stage 1 & 2)
app.post('/api/questions', async (req, res) => {
  const { question_text, category, user_id, ai_model } = req.body;
  if (!question_text || !category) {
    return res.status(400).json({ success: false, error: 'Question text and category are required.' });
  }

  const userId = user_id || 'user_anon';
  const now = new Date().toISOString();
  const activeModel = ai_model || 'gemini-1.5-flash';

  // Fetch active unanswered clusters for similarity match
  db.all("SELECT id, representative_question FROM CLUSTERS WHERE status = 'unanswered'", async (err, clusters) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    let bestSimilarity = 0.0;
    let bestClusterId = null;

    clusters.forEach(c => {
      const sim = calculateCosineSimilarity(question_text, c.representative_question);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestClusterId = c.id;
      }
    });

    const questionId = 'q_' + Date.now() + Math.floor(Math.random() * 1000);

    if (bestClusterId && bestSimilarity > 0.85) {
      // Merge
      db.run("INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [questionId, question_text, category, bestClusterId, userId, now],
        function (err) {
          if (err) return res.status(500).json({ success: false, error: err.message });
          
          // Trigger priority score updates
          updatePriorityScores(() => {
            res.status(200).json({
              success: true,
              message: 'Question received and merged into an existing cluster.',
              cluster_id: bestClusterId,
              is_new: false,
              similarity: parseFloat(bestSimilarity.toFixed(3))
            });
          });
        }
      );
    } else {
      // Create new cluster
      const clusterId = 'cluster_' + Date.now() + Math.floor(Math.random() * 100);
      
      try {
        // Stage 4: Generate and link AI answer asynchronously
        const aiDraft = await generateAIDraftAnswerAsync(question_text, category, activeModel);
        
        db.serialize(() => {
          db.run("INSERT INTO CLUSTERS (id, representative_question, category, upvotes, priority_score, status, created_at) VALUES (?, ?, ?, 0, 0.5, 'unanswered', ?)",
            [clusterId, question_text, category, now]);
          
          db.run("INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [questionId, question_text, category, clusterId, userId, now]);

          db.run("INSERT INTO ANSWERS (id, cluster_id, answer_text, author_type, user_id, upvotes, created_at) VALUES (?, ?, ?, 'ai', NULL, 0, ?)",
            ['ans_' + clusterId + '_ai', clusterId, aiDraft, now],
            function (err) {
              if (err) return res.status(500).json({ success: false, error: err.message });
              
              updatePriorityScores(() => {
                res.status(201).json({
                  success: true,
                  message: 'Question received. No similar questions found. Started new cluster.',
                  cluster_id: clusterId,
                  is_new: true,
                  similarity: parseFloat(bestSimilarity.toFixed(3))
                });
              });
            }
          );
        });
      } catch (aiErr) {
        console.error('[AI Draft Error] Failed in async flow:', aiErr);
        // Fail-safe flow using synchronous fallback
        const aiDraft = generateAIDraftAnswer(question_text, category);
        db.serialize(() => {
          db.run("INSERT INTO CLUSTERS (id, representative_question, category, upvotes, priority_score, status, created_at) VALUES (?, ?, ?, 0, 0.5, 'unanswered', ?)",
            [clusterId, question_text, category, now]);
          db.run("INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            [questionId, question_text, category, clusterId, userId, now]);
          db.run("INSERT INTO ANSWERS (id, cluster_id, answer_text, author_type, user_id, upvotes, created_at) VALUES (?, ?, ?, 'ai', NULL, 0, ?)",
            ['ans_' + clusterId + '_ai', clusterId, aiDraft, now],
            function (err) {
              if (err) return res.status(500).json({ success: false, error: err.message });
              updatePriorityScores(() => {
                res.status(201).json({
                  success: true,
                  message: 'Question received. No similar questions found. Started new cluster (with template fallback).',
                  cluster_id: clusterId,
                  is_new: true,
                  similarity: parseFloat(bestSimilarity.toFixed(3))
                });
              });
            }
          );
        });
      }
    }
  });
});

// List active unanswered clusters (Stage 3)
app.get('/api/questions', (req, res) => {
  updatePriorityScores((err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    db.all("SELECT id, representative_question, category, upvotes, priority_score, created_at FROM CLUSTERS WHERE status = 'unanswered' ORDER BY priority_score DESC", (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json(rows);
    });
  });
});

// Upvote question cluster (Stage 3)
app.post('/api/votes', (req, res) => {
  const { cluster_id, user_id } = req.body;
  if (!cluster_id || !user_id) {
    return res.status(400).json({ success: false, error: 'Cluster ID and user ID are required.' });
  }

  const now = new Date().toISOString();
  const voteId = 'v_' + Date.now();

  db.run("INSERT INTO VOTES (id, cluster_id, user_id, created_at) VALUES (?, ?, ?, ?)", [voteId, cluster_id, user_id, now], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ success: false, error: 'User has already upvoted this cluster.' });
      }
      return res.status(500).json({ success: false, error: err.message });
    }

    // Increment upvote count
    db.run("UPDATE CLUSTERS SET upvotes = upvotes + 1 WHERE id = ?", [cluster_id], () => {
      updatePriorityScores(() => {
        db.get("SELECT upvotes, priority_score FROM CLUSTERS WHERE id = ?", [cluster_id], (err, row) => {
          res.json({
            success: true,
            cluster_id,
            new_upvote_count: row.upvotes,
            new_priority_score: row.priority_score
          });
        });
      });
    });
  });
});

// Get Unanswered (Moderation view) (Stage 5)
app.get('/api/moderation/unanswered', (req, res) => {
  updatePriorityScores(() => {
    db.all(`
      SELECT c.id, c.representative_question, c.category, c.upvotes, c.priority_score, a.answer_text as ai_draft_answer
      FROM CLUSTERS c
      LEFT JOIN ANSWERS a ON c.id = a.cluster_id AND a.author_type = 'ai'
      WHERE c.status = 'unanswered'
      ORDER BY c.priority_score DESC
    `, (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: err.message });
      res.json(rows);
    });
  });
});

// Approve answer & Publish (Stage 5 & 6)
app.post('/api/moderation/approve', (req, res) => {
  const { cluster_id, approved_answer } = req.body;
  if (!cluster_id || !approved_answer) {
    return res.status(400).json({ success: false, error: 'Cluster ID and approved answer are required.' });
  }

  const now = new Date().toISOString();

  db.get("SELECT representative_question, category FROM CLUSTERS WHERE id = ?", [cluster_id], (err, cluster) => {
    if (err || !cluster) {
      return res.status(404).json({ success: false, error: 'Cluster not found or error encountered.' });
    }

    const faqId = 'faq_' + Date.now();

    db.serialize(() => {
      // 1. Add to published FAQ
      db.run("INSERT INTO PUBLISHED_FAQ (id, cluster_id, question, answer, category, published_at) VALUES (?, ?, ?, ?, ?, ?)",
        [faqId, cluster_id, cluster.representative_question, approved_answer, cluster.category, now]);
      
      // 2. Mark cluster as answered
      db.run("UPDATE CLUSTERS SET status = 'answered' WHERE id = ?", [cluster_id], function(err) {
        if (err) return res.status(500).json({ success: false, error: err.message });
        
        res.json({
          success: true,
          message: 'Answer approved and published to the public FAQ base.',
          faq_id: faqId
        });
      });
    });
  });
});

// View and Search published FAQ (Stage 6)
app.get('/api/faq', (req, res) => {
  const { search, category } = req.query;

  let query = "SELECT id as faq_id, question, answer, category, published_at FROM PUBLISHED_FAQ WHERE 1=1";
  const params = [];

  if (category) {
    query += " AND category = ?";
    params.push(category);
  }

  if (search) {
    query += " AND (question LIKE ? OR answer LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  query += " ORDER BY published_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(rows);
  });
});

// Conversational AI Q&A Assistant Search endpoint
app.post('/api/chat', (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Message is required.' });
  }

  db.all("SELECT id as faq_id, question, answer, category FROM PUBLISHED_FAQ", (err, faqs) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    let bestSimilarity = 0.0;
    let bestFaq = null;

    faqs.forEach(f => {
      const sim = calculateCosineSimilarity(message, f.question);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestFaq = f;
      }
    });

    if (bestFaq && bestSimilarity > 0.35) {
      res.json({
        success: true,
        answer: bestFaq.answer,
        matched_question: bestFaq.question,
        similarity: parseFloat(bestSimilarity.toFixed(3))
      });
    } else {
      res.json({
        success: false,
        answer: "I couldn't find a verified answer matching your question in our FAQ database. Would you like to submit this question to our community prioritizing queue?"
      });
    }
  });
});

// Git synchronization endpoint
app.post('/api/git-sync', (req, res) => {
  const { exec } = require('child_process');
  
  exec('git push origin main', (error, stdout, stderr) => {
    if (error) {
      console.error(`Git push error: ${error}`);
      return res.status(500).json({ 
        success: false, 
        message: 'Git sync failed. Verify remote connection and credentials.',
        details: stderr || error.message 
      });
    }
    res.json({ 
      success: true, 
      message: 'Successfully synchronized code changes with remote Git repository.',
      details: stdout 
    });
  });
});

// Run server
app.listen(PORT, () => {
  console.log(`Express server successfully running on http://localhost:${PORT}`);
});
