import sqlite3
import math
import re
import datetime
import time
import sys

# Define standard categories
CATEGORIES = [
    "General",
    "Account Security",
    "Billing",
    "Technical Support",
    "Community Policies"
]

# STOP WORDS for clean token-based cosine similarity
STOP_WORDS = {"the", "a", "an", "is", "are", "to", "for", "in", "on", "at", "my", "how", "what", "where", "why", "do", "i", "can", "reset", "forgot"}

def initialize_database():
    """Initializes in-memory SQLite database representing the system state."""
    conn = sqlite3.connect(":memory:")
    cursor = conn.cursor()
    
    # Enable foreign keys
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # 1. CLUSTERS TABLE
    cursor.execute("""
    CREATE TABLE CLUSTERS (
        id TEXT PRIMARY KEY,
        representative_question TEXT NOT NULL,
        category TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        priority_score REAL DEFAULT 0.0,
        status TEXT DEFAULT 'unanswered',
        created_at TEXT NOT NULL
    );
    """)
    
    # 2. QUESTIONS TABLE
    cursor.execute("""
    CREATE TABLE QUESTIONS (
        id TEXT PRIMARY KEY,
        question_text TEXT NOT NULL,
        category TEXT NOT NULL,
        cluster_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
    );
    """)
    
    # 3. VOTES TABLE
    cursor.execute("""
    CREATE TABLE VOTES (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE,
        UNIQUE(cluster_id, user_id)
    );
    """)
    
    # 4. ANSWERS TABLE
    cursor.execute("""
    CREATE TABLE ANSWERS (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        answer_text TEXT NOT NULL,
        author_type TEXT NOT NULL,
        user_id TEXT,
        upvotes INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(cluster_id) REFERENCES CLUSTERS(id) ON DELETE CASCADE
    );
    """)
    
    # 5. PUBLISHED_FAQ TABLE
    cursor.execute("""
    CREATE TABLE PUBLISHED_FAQ (
        id TEXT PRIMARY KEY,
        cluster_id TEXT NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        category TEXT NOT NULL,
        published_at TEXT NOT NULL
    );
    """)
    
    conn.commit()
    return conn, cursor

# =====================================================================
# STAGE 2: NLP Deduplication (Token-based Cosine Similarity)
# =====================================================================
def get_tokens(text):
    """Extracts cleaned lowercased word tokens from text."""
    words = re.findall(r"\w+", text.lower())
    return [w for w in words if w not in STOP_WORDS]

def calculate_cosine_similarity(text1, text2):
    """Calculates cosine similarity between two sentences based on word frequency vectorization."""
    tokens1 = get_tokens(text1)
    tokens2 = get_tokens(text2)
    
    if not tokens1 or not tokens2:
        # Fallback to simple Jaccard index if tokens are empty
        set1, set2 = set(text1.lower().split()), set(text2.lower().split())
        intersection = set1.intersection(set2)
        union = set1.union(set2)
        return len(intersection) / len(union) if union else 0.0
        
    # Build vocabulary
    vocab = set(tokens1 + tokens2)
    
    # Vector frequency representation
    vec1 = {word: tokens1.count(word) for word in vocab}
    vec2 = {word: tokens2.count(word) for word in vocab}
    
    # Calculate dot product
    dot_product = sum(vec1[w] * vec2[w] for w in vocab)
    
    # Calculate magnitudes
    mag1 = math.sqrt(sum(vec1[w]**2 for w in vocab))
    mag2 = math.sqrt(sum(vec2[w]**2 for w in vocab))
    
    if mag1 == 0.0 or mag2 == 0.0:
        return 0.0
        
    return dot_product / (mag1 * mag2)

def find_best_cluster_match(cursor, question_text):
    """Queries all active clusters and returns the best match above similarity threshold 0.85."""
    cursor.execute("SELECT id, representative_question, category FROM CLUSTERS WHERE status = 'unanswered'")
    clusters = cursor.fetchall()
    
    best_similarity = 0.0
    best_cluster_id = None
    
    for cid, rep_q, cat in clusters:
        sim = calculate_cosine_similarity(question_text, rep_q)
        if sim > best_similarity:
            best_similarity = sim
            best_cluster_id = cid
            
    return best_cluster_id, best_similarity

# =====================================================================
# STAGE 3: Priority Scoring
# =====================================================================
def calculate_priority_score(upvotes, created_at_str, hours_offset=0.0):
    """
    Calculates priority score with recency time decay.
    Formula: Score = (Upvotes + 1) / sqrt(Delta_t_hours + 2)
    """
    created_at = datetime.datetime.fromisoformat(created_at_str)
    now = datetime.datetime.now(datetime.timezone.utc) if created_at.tzinfo else datetime.datetime.now()
    
    delta_t = now - created_at
    delta_hours = (delta_t.total_seconds() / 3600.0) + hours_offset
    
    # Prevent negative time delta in simulator
    if delta_hours < 0:
        delta_hours = 0.0
        
    score = (upvotes + 1.0) / math.sqrt(delta_hours + 2.0)
    return round(score, 3)

def update_all_cluster_priority_scores(cursor, hours_offset=0.0):
    """Updates active cluster scores in database."""
    cursor.execute("SELECT id, upvotes, created_at FROM CLUSTERS WHERE status = 'unanswered'")
    clusters = cursor.fetchall()
    
    for cid, upvotes, created_at in clusters:
        score = calculate_priority_score(upvotes, created_at, hours_offset)
        cursor.execute("UPDATE CLUSTERS SET priority_score = ? WHERE id = ?", (score, cid))

# =====================================================================
# STAGE 4: AI-Assisted Answer Generation
# =====================================================================
def generate_ai_draft_answer(question_text, category):
    """Simulates a call to an LLM API to generate a draft response."""
    # Let's create beautiful mock responses based on common key subjects
    text = question_text.lower()
    if "password" in text or "reset" in text:
        return f"To reset your password in the {category} portal, click 'Forgot Password' on the login screen, enter your email address, and click Submit. A secure verification link will be sent to your inbox to let you establish a new credential."
    elif "invoice" in text or "bill" in text or "receipt" in text or "payment" in text:
        return f"You can access and download your current invoices under the Billing section. Go to Settings -> Invoices, select the date duration, and choose PDF format for download. If payment fails, please check your linked credit card details."
    elif "guideline" in text or "policy" in text or "terms" in text or "rule" in text:
        return "Community guidelines require all members to be respectful, objective, and constructive. Contributions that contain abusive text, advertisements, or highly speculative facts will be flagged and removed by the moderation staff."
    else:
        return f"Thank you for your question regarding {category}. Our support team advises visiting the documentation section, verifying your active credentials, or ensuring your environment parameters meet the standard system requirements."

# =====================================================================
# PIPELINE STAGES & OPERATIONS
# =====================================================================
def submit_question(conn, cursor, question_text, category, user_id, timestamp=None):
    """Stage 1 & 2: Receives question, performs NLP deduplication, and routes."""
    if not timestamp:
        timestamp = datetime.datetime.now().isoformat()
        
    # Stage 2: Deduplication similarity check
    best_cid, similarity = find_best_cluster_match(cursor, question_text)
    
    is_new = True
    if best_cid and similarity > 0.85:
        # Merge question into existing cluster
        is_new = False
        cluster_id = best_cid
    else:
        # Create a new cluster
        cluster_id = f"cluster_{int(time.time() * 1000) % 1000000}"
        cursor.execute("""
            INSERT INTO CLUSTERS (id, representative_question, category, upvotes, priority_score, status, created_at)
            VALUES (?, ?, ?, 0, 0.5, 'unanswered', ?)
        """, (cluster_id, question_text, category, timestamp))
        
        # Stage 4: Trigger AI draft answer generation immediately for the new cluster
        ai_draft = generate_ai_draft_answer(question_text, category)
        cursor.execute("""
            INSERT INTO ANSWERS (id, cluster_id, answer_text, author_type, user_id, upvotes, created_at)
            VALUES (?, ?, ?, 'ai', NULL, 0, ?)
        """, (f"ans_{cluster_id}_ai", cluster_id, ai_draft, timestamp))
        
    # Write the question record
    question_id = f"q_{int(time.time() * 1000) % 1000000}"
    cursor.execute("""
        INSERT INTO QUESTIONS (id, question_text, category, cluster_id, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (question_id, question_text, category, cluster_id, user_id, timestamp))
    
    conn.commit()
    return cluster_id, is_new, similarity

def cast_upvote(conn, cursor, cluster_id, user_id):
    """Stage 3: Records a user upvote and triggers recalculation of scores."""
    timestamp = datetime.datetime.now().isoformat()
    try:
        # Insert vote to ensure unique votes per cluster/user
        cursor.execute("""
            INSERT INTO VOTES (id, cluster_id, user_id, created_at)
            VALUES (?, ?, ?, ?)
        """, (f"v_{int(time.time() * 1000) % 1000000}", cluster_id, user_id, timestamp))
        
        # Increment upvote count in Cluster
        cursor.execute("UPDATE CLUSTERS SET upvotes = upvotes + 1 WHERE id = ?", (cluster_id,))
        conn.commit()
        return True, "Vote registered."
    except sqlite3.ConstraintError:
        return False, "You have already upvoted this question cluster."

def get_moderator_queue(cursor):
    """Stage 5: Fetches all unanswered clusters sorted by priority score."""
    cursor.execute("""
        SELECT c.id, c.representative_question, c.category, c.upvotes, c.priority_score, a.answer_text, c.created_at
        FROM CLUSTERS c
        LEFT JOIN ANSWERS a ON c.id = a.cluster_id AND a.author_type = 'ai'
        WHERE c.status = 'unanswered'
        ORDER BY c.priority_score DESC
    """)
    return cursor.fetchall()

def approve_and_publish_faq(conn, cursor, cluster_id, approved_answer):
    """Stage 5 & 6: Expert reviews and publishes Q&A to public FAQ base."""
    # 1. Get cluster details
    cursor.execute("SELECT representative_question, category FROM CLUSTERS WHERE id = ?", (cluster_id,))
    cluster = cursor.fetchone()
    if not cluster:
        return False, "Cluster not found."
    
    rep_question, category = cluster
    timestamp = datetime.datetime.now().isoformat()
    faq_id = f"faq_{int(time.time() * 1000) % 1000000}"
    
    # 2. Add to published FAQ
    cursor.execute("""
        INSERT INTO PUBLISHED_FAQ (id, cluster_id, question, answer, category, published_at)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (faq_id, cluster_id, rep_question, approved_answer, category, timestamp))
    
    # 3. Update Cluster status to answered
    cursor.execute("UPDATE CLUSTERS SET status = 'answered' WHERE id = ?", (cluster_id,))
    conn.commit()
    return True, faq_id

def search_public_faq(cursor, query="", category=""):
    """Stage 6: Browse or keyword search published FAQs."""
    sql = "SELECT id, question, answer, category, published_at FROM PUBLISHED_FAQ WHERE 1=1"
    params = []
    
    if category:
        sql += " AND category = ?"
        params.append(category)
        
    if query:
        sql += " AND (question LIKE ? OR answer LIKE ?)"
        params.append(f"%{query}%")
        params.append(f"%{query}%")
        
    sql += " ORDER BY published_at DESC"
    cursor.execute(sql, params)
    return cursor.fetchall()

# =====================================================================
# CLI INTERACTIVE DEMONSTRATION UNIT
# =====================================================================
def run_interactive_demo():
    print("=" * 70)
    print(" CROWD-SOURCED FAQ GENERATION SYSTEM - PIPELINE INTEGRATION TEST")
    print("=" * 70)
    print("Initializing in-memory database system...")
    conn, cursor = initialize_database()
    print("System active! Folder scaffold directories mapped.")
    
    # Insert some seed data with different timestamps (simulate elapsed hours)
    now = datetime.datetime.now()
    two_hours_ago = (now - datetime.timedelta(hours=2)).isoformat()
    five_hours_ago = (now - datetime.timedelta(hours=5)).isoformat()
    
    # Seed 1
    submit_question(conn, cursor, "How can I change my email address?", "Account Security", "user_101", five_hours_ago)
    # Seed 2
    submit_question(conn, cursor, "How do I download monthly invoices?", "Billing", "user_102", two_hours_ago)
    
    # Add upvotes to Seed 1
    cursor.execute("SELECT id FROM CLUSTERS")
    cids = [r[0] for r in cursor.fetchall()]
    if cids:
        cast_upvote(conn, cursor, cids[0], "user_991")
        cast_upvote(conn, cursor, cids[0], "user_992")
        cast_upvote(conn, cursor, cids[1], "user_993")
        
    update_all_cluster_priority_scores(cursor)

    while True:
        update_all_cluster_priority_scores(cursor)
        print("\n" + "-" * 50)
        print("MAIN PIPELINE DASHBOARD")
        print("-" * 50)
        print("1. [Stage 1 & 2] Submit a New Question (NLP Deduplication Check)")
        print("2. [Stage 3] View Active Cluster Queue (Priority Scores)")
        print("3. [Stage 3] Cast an Upvote on a Question Cluster")
        print("4. [Stage 5] Access Moderation Panel (Review AI Draft & Publish)")
        print("5. [Stage 6] View & Search Published FAQ")
        print("6. Exit")
        
        choice = input("\nEnter choice (1-6): ").strip()
        
        if choice == "1":
            print("\nSelect Category:")
            for i, cat in enumerate(CATEGORIES, 1):
                print(f" {i}. {cat}")
            cat_choice = input("Choice (1-5): ").strip()
            category = CATEGORIES[int(cat_choice) - 1] if cat_choice.isdigit() and 1 <= int(cat_choice) <= len(CATEGORIES) else "General"
            
            question_text = input("Enter your question text: ").strip()
            if not question_text:
                print("Question cannot be empty.")
                continue
                
            user_id = input("Enter User ID (default: user_anon): ").strip() or "user_anon"
            
            print("\nProcessing through NLP Layer...")
            cid, is_new, sim = submit_question(conn, cursor, question_text, category, user_id)
            
            print("-" * 40)
            if is_new:
                print(f"STATUS: Created NEW cluster.")
                print(f"Cluster ID: {cid}")
                print(f"No similar active questions found (max similarity: {sim:.2f}).")
                print("Triggered Stage 4: AI draft answer generated and linked.")
            else:
                print(f"STATUS: MERGED into existing cluster ({cid}).")
                print(f"High similarity detected: {sim:.2f} (> 0.85 threshold).")
            print("-" * 40)
            
        elif choice == "2":
            print("\nACTIVE UNANSWERED QUEUE (Stage 3):")
            print(f"{'Cluster ID':15} | {'Category':15} | {'Votes':5} | {'Score':6} | {'Representative Question'}")
            print("-" * 75)
            cursor.execute("SELECT id, category, upvotes, priority_score, representative_question FROM CLUSTERS WHERE status = 'unanswered' ORDER BY priority_score DESC")
            rows = cursor.fetchall()
            if not rows:
                print("No unanswered question clusters in queue.")
            for row in rows:
                print(f"{row[0]:15} | {row[1]:15} | {row[2]:<5} | {row[3]:<6.3f} | {row[4]}")
                
        elif choice == "3":
            cursor.execute("SELECT id, representative_question FROM CLUSTERS WHERE status = 'unanswered'")
            rows = cursor.fetchall()
            if not rows:
                print("No question clusters available to vote on.")
                continue
            print("\nUnanswered Questions:")
            for i, row in enumerate(rows, 1):
                print(f" {i}. [{row[0]}] {row[1]}")
            q_idx = input("Select question index to upvote: ").strip()
            if q_idx.isdigit() and 1 <= int(q_idx) <= len(rows):
                cid = rows[int(q_idx) - 1][0]
                uid = input("Enter your User ID (to prevent double voting): ").strip()
                if not uid:
                    print("User ID is required.")
                    continue
                success, msg = cast_upvote(conn, cursor, cid, uid)
                print(f"\nResult: {msg}")
            else:
                print("Invalid index.")
                
        elif choice == "4":
            queue = get_moderator_queue(cursor)
            if not queue:
                print("\nModeration queue is empty. No questions to moderate.")
                continue
            
            print("\nMODERATOR ACTIVE QUEUE (Stage 5):")
            for i, row in enumerate(queue, 1):
                print(f"\n{i}. Cluster: {row[0]} | Category: {row[2]} | Upvotes: {row[3]} | Priority: {row[4]:.3f}")
                print(f"   Question: {row[1]}")
                print(f"   AI Draft Answer: {row[5]}")
                
            mod_idx = input("\nSelect index to edit, approve and publish (or press Enter to return): ").strip()
            if not mod_idx:
                continue
                
            if mod_idx.isdigit() and 1 <= int(mod_idx) <= len(queue):
                selected_cluster = queue[int(mod_idx) - 1]
                cid = selected_cluster[0]
                ai_draft = selected_cluster[5]
                
                print(f"\nReviewing AI Draft for: '{selected_cluster[1]}'")
                print(f"AI Drafted text:\n---\n{ai_draft}\n---")
                
                edit_choice = input("Do you want to edit this answer? (y/n, default: n): ").strip().lower()
                if edit_choice == "y":
                    approved_ans = input("Enter approved custom answer: ").strip()
                else:
                    approved_ans = ai_draft
                    
                if not approved_ans:
                    print("Answer cannot be empty.")
                    continue
                    
                success, faq_id = approve_and_publish_faq(conn, cursor, cid, approved_ans)
                if success:
                    print(f"\nSUCCESS: Published to Public FAQ with ID: {faq_id}!")
                    print("Status updated to 'answered'. Removed from moderation queue.")
            else:
                print("Invalid index.")
                
        elif choice == "5":
            print("\nPUBLIC FAQ DATABASE (Stage 6):")
            search_query = input("Enter search query (press Enter for all): ").strip()
            faqs = search_public_faq(cursor, search_query)
            if not faqs:
                print("No FAQs found matching your criteria.")
            else:
                print(f"\nFound {len(faqs)} published FAQ entries:")
                for row in faqs:
                    print("=" * 60)
                    print(f"FAQ ID: {row[0]} | Category: {row[3]}")
                    print(f"Q: {row[1]}")
                    print(f"A: {row[2]}")
                    print(f"Published: {row[4]}")
                print("=" * 60)
                
        elif choice == "6":
            print("\nExiting Integration Pipeline simulator. All code in place.")
            break
        else:
            print("Invalid choice. Try again.")

if __name__ == "__main__":
    run_interactive_demo()
