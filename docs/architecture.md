# Crowd-Sourced FAQ Generation System - Architecture & Pipeline Spec

This document details the system design, pipeline sequence flow, database schemas, and mathematical scoring rules for the project.

---

## 1. System Pipeline Overview

The system operates across six integrated stages:

```mermaid
sequenceDiagram
    autonumber
    actor User as Community User
    actor Moderator as Admin / Moderator
    participant FE as React Frontend
    participant BE as Express Backend
    participant DB as SQLite / Postgres
    participant NLP as AI/NLP Service (Python)

    User->>FE: Submit Question (text + category)
    FE->>BE: POST /api/questions
    BE->>BE: Create temporary question record
    BE->>NLP: HTTP POST /nlp/cluster (question_text)
    NLP->>NLP: Embed question & check Cosine Similarity
    alt Max Similarity > 0.85
        NLP-->>BE: Return existing cluster_id
        BE->>DB: Assign question to cluster & recalculate Priority
    else Max Similarity <= 0.85
        NLP-->>BE: Return 'new'
        BE->>DB: Create new cluster & set Priority
    end
    BE-->>FE: Return cluster_id and status (new/merged)

    Note over User, FE: Voting & Priority Phase
    User->>FE: Click Upvote on Cluster
    FE->>BE: POST /api/votes
    BE->>DB: Record Vote, increment Upvote count
    BE->>BE: Recalculate Priority Score
    BE-->>FE: Return new scores & refresh priority lists

    Note over BE, NLP: Answer Generation Phase
    NLP->>BE: Fetch top cluster from queue (Scheduler or Event)
    NLP->>NLP: Call LLM API (Claude/GPT) with structured prompt
    NLP->>BE: POST /api/answers/draft (cluster_id, draft_text)
    BE->>DB: Store draft_answer in database

    Note over Moderator, FE: Moderation Phase
    Moderator->>FE: Access Moderation Dashboard
    FE->>BE: GET /api/moderation/unanswered
    BE->>DB: Fetch unanswered clusters with AI draft and community answers
    BE-->>FE: Return list
    Moderator->>FE: Edit & Click 'Approve'
    FE->>BE: POST /api/moderation/approve (cluster_id, approved_answer)
    BE->>DB: Mark cluster as 'answered', publish Q&A pair to FAQ table
    BE-->>FE: Return success

    Note over User, FE: Public Browse & Search
    User->>FE: Type search keyword on FAQ Page
    FE->>BE: GET /api/faq?search=keyword
    BE->>DB: SQL LIKE / FTS Search on FAQ table
    BE-->>FE: Return matching Q&A list
```

---

## 2. Database Schema

The database can be modeled using SQLite or PostgreSQL. The MVP uses **SQLite** for rapid sprint deployment.

```mermaid
erDiagram
    QUESTIONS {
        string id PK
        string question_text
        string category
        string cluster_id FK
        string user_id
        datetime created_at
    }
    CLUSTERS {
        string id PK
        string representative_question
        string category
        int upvotes
        double priority_score
        string status "unanswered | answered"
        datetime created_at
    }
    VOTES {
        string id PK
        string cluster_id FK
        string user_id
        datetime created_at
    }
    ANSWERS {
        string id PK
        string cluster_id FK
        string answer_text
        string author_type "ai | community"
        string user_id "null for AI"
        int upvotes
        datetime created_at
    }
    PUBLISHED_FAQ {
        string id PK
        string cluster_id FK
        string question
        string answer
        string category
        datetime published_at
    }

    CLUSTERS ||--o{ QUESTIONS : "groups"
    CLUSTERS ||--o{ VOTES : "gathers"
    CLUSTERS ||--o{ ANSWERS : "receives"
    CLUSTERS ||--o| PUBLISHED_FAQ : "publishes_to"
```

---

## 3. Mathematical & Algorithmic Rules

### A. Semantic Deduplication (NLP Layer)
1. **Sentence Embeddings**: The text of an incoming question $Q_{new}$ is converted to a vector $\vec{e}_{new}$ using a pre-trained sentence transformer (e.g., `all-MiniLM-L6-v2`).
2. **Cosine Similarity**: Compare $\vec{e}_{new}$ with the embeddings of all representative questions $\{\vec{e}_1, \vec{e}_2, ..., \vec{e}_N\}$ of active clusters:
   $$\text{Similarity}(Q_{new}, Q_i) = \frac{\vec{e}_{new} \cdot \vec{e}_i}{\|\vec{e}_{new}\| \|\vec{e}_i\|}$$
3. **Threshold Check**:
   * If $\max_i(\text{Similarity}(Q_{new}, Q_i)) > 0.85$, assign $Q_{new}$ to cluster $i$.
   * If $\max_i(\text{Similarity}(Q_{new}, Q_i)) \le 0.85$, create new cluster $C_{new}$ with representative question $Q_{new}$.

### B. Priority Scoring (Backend Layer)
To ensure relevant questions float to the top and old questions don't permanently clog the queue, the priority score $S$ is calculated using upvotes and recency decay:
$$S = \frac{\text{Upvotes} + 1}{(\Delta t_{\text{hours}} + 2)^{0.5}}$$
Where:
* $\text{Upvotes}$ is the total number of community votes.
* $\Delta t_{\text{hours}}$ is the duration in hours since the cluster was created:
  $$\Delta t_{\text{hours}} = \frac{T_{\text{current}} - T_{\text{creation}}}{3600 \text{ seconds}}$$

---

## 4. Technology Stack Mapping

* **Frontend**: React (Vite-scaffolded), Styled with Tailwind CSS, icons by Lucide-React.
* **Backend API**: Node.js with Express, data stored in SQLite.
* **NLP Service**: Python 3.10+, using standard NLP packages.
* **Integration File**: `integration_test.py` - handles mock simulations.
