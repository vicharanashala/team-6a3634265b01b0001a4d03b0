"""
Crowd-Sourced FAQ — NLP Microservice
Flask + sentence-transformers  |  Primary AI: xAI Grok
"""

import os
import numpy as np
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Config ────────────────────────────────────────────────────────────────────
PORT             = int(os.getenv("NLP_PORT", 8000))
BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:5000")
GROK_API_KEY     = os.getenv("GROK_API_KEY", "")
GROK_MODEL       = os.getenv("GROK_MODEL", "grok-3")
GROK_TEMPERATURE = float(os.getenv("GROK_TEMPERATURE", 0.7))
EMBEDDING_MODEL  = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
SIM_THRESHOLD    = float(os.getenv("SIMILARITY_THRESHOLD", 0.85))

GROK_API_URL = "https://api.x.ai/v1/chat/completions"

# ── Load sentence-transformer model once at startup ───────────────────────────
print(f"[NLP] Loading embedding model: {EMBEDDING_MODEL} …")
model = SentenceTransformer(EMBEDDING_MODEL)
print("[NLP] Model ready ✓")

# ── In-memory embedding cache  { cluster_id: np.ndarray } ────────────────────
_embedding_cache: dict[str, np.ndarray] = {}


# ─────────────────────────────────────────────────────────────────────────────
#  Helpers
# ─────────────────────────────────────────────────────────────────────────────

def embed(text: str) -> np.ndarray:
    """Return a 1-D numpy embedding vector."""
    return model.encode(text, convert_to_numpy=True)


def cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(cosine_similarity(a.reshape(1, -1), b.reshape(1, -1))[0][0])


def call_grok(system_prompt: str, user_message: str) -> str | None:
    """
    Call xAI Grok API.
    Returns the response text, or None on failure.
    """
    if not GROK_API_KEY:
        print("[Grok] GROK_API_KEY is not set.")
        return None

    payload = {
        "model": GROK_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message}
        ],
        "temperature": GROK_TEMPERATURE,
        "max_tokens": 512
    }
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROK_API_KEY}"
    }

    try:
        resp = requests.post(GROK_API_URL, json=payload, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
    except requests.exceptions.HTTPError as e:
        print(f"[Grok] HTTP error {e.response.status_code}: {e.response.text}")
    except Exception as e:
        print(f"[Grok] Request failed: {e}")
    return None


def template_answer(question: str, category: str) -> str:
    """Rule-based fallback when Grok is unavailable."""
    q = question.lower()
    if any(k in q for k in ("password", "reset", "login", "credential")):
        return (f"To reset your credentials in the {category} module, click 'Forgot Password' "
                "on the login page, enter your account email, and follow the link sent to your inbox.")
    if any(k in q for k in ("invoice", "bill", "receipt", "payment", "charge")):
        return ("You can find your receipts under Settings → Invoices. "
                "Select the billing period and click 'Download PDF'.")
    if any(k in q for k in ("policy", "guideline", "rule", "terms", "ad", "advertis")):
        return ("Community standards require all posts to be polite and professional. "
                "Content that violates these rules will be removed by moderators.")
    return (f"For questions regarding {category}, please visit our documentation portal, "
            "verify your credentials, or contact our support team for personalised assistance.")


# ─────────────────────────────────────────────────────────────────────────────
#  Endpoints
# ─────────────────────────────────────────────────────────────────────────────

@app.route("/nlp/cluster", methods=["POST"])
def cluster_question():
    """
    Semantic deduplication — called by the Express backend on every new question.

    Request body:
        {
          "question_text": "...",
          "clusters": [ { "id": "...", "representative_question": "..." }, ... ]
        }

    Response:
        { "cluster_id": "<id> | new", "similarity": 0.0–1.0 }
    """
    data          = request.get_json(silent=True) or {}
    question_text = data.get("question_text", "").strip()
    clusters      = data.get("clusters", [])

    if not question_text:
        return jsonify({"error": "question_text is required"}), 400

    new_vec  = embed(question_text)
    best_id  = "new"
    best_sim = 0.0

    for c in clusters:
        cid = c.get("id")
        rep = c.get("representative_question", "")
        if not cid or not rep:
            continue
        if cid not in _embedding_cache:
            _embedding_cache[cid] = embed(rep)
        sim = cosine_sim(new_vec, _embedding_cache[cid])
        if sim > best_sim:
            best_sim = sim
            best_id  = cid

    if best_sim >= SIM_THRESHOLD:
        return jsonify({"cluster_id": best_id, "similarity": round(best_sim, 4)})
    return jsonify({"cluster_id": "new", "similarity": round(best_sim, 4)})


@app.route("/nlp/similarity", methods=["POST"])
def similarity():
    """
    One-shot cosine similarity between two texts.

    Request body: { "text_a": "...", "text_b": "..." }
    Response:     { "similarity": 0.0–1.0 }
    """
    data   = request.get_json(silent=True) or {}
    text_a = data.get("text_a", "").strip()
    text_b = data.get("text_b", "").strip()

    if not text_a or not text_b:
        return jsonify({"error": "text_a and text_b are required"}), 400

    sim = cosine_sim(embed(text_a), embed(text_b))
    return jsonify({"similarity": round(sim, 4)})


@app.route("/nlp/embed", methods=["POST"])
def embed_batch():
    """
    Batch embedding.

    Request body: { "texts": ["...", "..."] }
    Response:     { "embeddings": [[float, ...], ...] }
    """
    data  = request.get_json(silent=True) or {}
    texts = data.get("texts", [])

    if not texts or not isinstance(texts, list):
        return jsonify({"error": "texts must be a non-empty list"}), 400

    vecs = model.encode(texts, convert_to_numpy=True)
    return jsonify({"embeddings": vecs.tolist()})


@app.route("/nlp/answer", methods=["POST"])
def generate_answer():
    """
    Generate an AI answer using xAI Grok (with template fallback).

    Request body:
        {
          "question_text": "...",
          "category": "...",
          "custom_prompt": "..."   (optional – additional instructions)
        }

    Response:
        { "answer": "...", "provider": "grok-beta | template-fallback" }
    """
    data          = request.get_json(silent=True) or {}
    question_text = data.get("question_text", "").strip()
    category      = data.get("category", "General").strip()
    custom_prompt = data.get("custom_prompt", "").strip()

    if not question_text:
        return jsonify({"error": "question_text is required"}), 400

    system_prompt = (
        f"You are an expert technical support assistant for the '{category}' category. "
        "Provide a concise, step-by-step answer that is professional and easy to follow."
    )
    if custom_prompt:
        system_prompt += f"\n\nAdditional instructions: {custom_prompt}"

    answer = call_grok(system_prompt, question_text)

    if answer:
        return jsonify({"answer": answer, "provider": GROK_MODEL})

    # Grok unavailable — use template fallback
    fallback = template_answer(question_text, category)
    return jsonify({"answer": fallback, "provider": "template-fallback"})


@app.route("/nlp/chat", methods=["POST"])
def chat():
    """
    Conversational Q&A backed by Grok.
    Called by the frontend chat assistant when the backend FAQ search returns no match.

    Request body:  { "message": "...", "context": "..." (optional published FAQ text) }
    Response:      { "answer": "...", "provider": "grok-beta | template-fallback" }
    """
    data    = request.get_json(silent=True) or {}
    message = data.get("message", "").strip()
    context = data.get("context", "").strip()

    if not message:
        return jsonify({"error": "message is required"}), 400

    system_prompt = (
        "You are a helpful, friendly FAQ assistant. "
        "Answer the user's question concisely and accurately."
    )
    if context:
        system_prompt += (
            f"\n\nUse the following verified FAQ content as your primary knowledge source:\n{context}"
        )

    answer = call_grok(system_prompt, message)
    if answer:
        return jsonify({"answer": answer, "provider": GROK_MODEL})

    return jsonify({
        "answer": "I couldn't find a verified answer. Would you like to submit this question to our community queue?",
        "provider": "template-fallback"
    })


@app.route("/nlp/cache/clear", methods=["POST"])
def clear_cache():
    """Evict all cached cluster embeddings (admin utility)."""
    count = len(_embedding_cache)
    _embedding_cache.clear()
    return jsonify({"success": True, "cleared": count})


@app.route("/health", methods=["GET"])
def health():
    """Liveness probe."""
    return jsonify({
        "status":    "ok",
        "model":     EMBEDDING_MODEL,
        "ai":        GROK_MODEL,
        "threshold": SIM_THRESHOLD,
        "backend":   BACKEND_URL,
        "cache_size": len(_embedding_cache)
    })


# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print(f"[NLP] Starting on port {PORT}  |  AI provider: {GROK_MODEL}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
