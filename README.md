# Crowd-Sourced FAQ Generation System

The **Crowd-Sourced FAQ Generation System** is an intelligent, collaborative web platform that harnesses the collective knowledge of a user community to automatically generate, curate, and maintain a high-quality Frequently Asked Questions (FAQ) repository. 

Traditional FAQ pages rely on static sets of manually written questions and answers, which quickly become outdated and fail to reflect actual user concerns. This project addresses that gap by building a dynamic, crowd-powered pipeline where questions are submitted by users, semantically clustered using Natural Language Processing (NLP), prioritized through community voting, and answered through a combination of AI-generated drafts and human expert review.

---

## 📂 Project Structure & Layout

To support rapid parallel development during our 3-Day Sprint, the repository is divided into self-contained service spaces:

```bash
├── 📁 frontend/             # React.js SPA (UI for question submission, voting, and dashboards)
│   └── package.json         # Scaffolded with Vite + Tailwind CSS
├── 📁 backend/              # Node.js + Express REST API (Business logic, SQLite, scoring rules)
│   └── package.json         # Scaffolded with SQLite3 + Express + Nodemon
├── 📁 nlp-service/          # Python AI/NLP Service (Embeddings, Cosine Similarity & LLM Curation)
│   └── requirements.txt     # Scaffolded with Sentence-Transformers + Faiss + Flask
├── 📁 docs/                 # Team Lead & Architecture Documentation
│   ├── api_contract.md      # REST schema contract for FE/BE integrations
│   ├── architecture.md      # Database schemas, Mermaid diagrams, and mathematical rules
│   ├── demo_script.md       # 10-Step video demonstration and presentation walkthrough
│   └── CrowdFAQ_ProjectDocument.pdf # Original full project sprint specifications
├── 📄 integration_test.py   # Complete end-to-end Python pipeline simulator
└── 📄 README.md             # Main repository index (This file)
```

---

## 👥 Team Roster & Module Responsibilities

| Member | Role | Module & Task Assignment |
|---|---|---|
| **You (Team Lead)** | Architect / PM | Repository structure, API contracts, sequence architecture, and integration script. |
| **Ganeshprabu BO** | Frontend Dev | Question submission form, FAQ display page |
| **Mohd Warish** | Backend Dev | REST API, database schema, voting endpoints |
| **Tejeswara Reddy** | AI/NLP Engineer | Semantic clustering, deduplication engine, LLM integration |
| **Chaitanya Ram S** | Frontend Dev | Voting UI, community answer submission |
| **Ritzy Elsa George** | Frontend Dev | Moderator dashboard UI |
| **Vineelkrishna K** | Backend Dev | Search API, FAQ publish endpoint |
| **Nekha Mariya Paul** | AI/NLP Engineer | Sentence embeddings, similarity scoring |
| **Harshith Sai Suraj** | Backend + QA | Moderation API, testing |
| **Pursharth Kaushal** | QA + Docs | Test cases, documentation, README |
| **Abhishek Kumar** | AI + Backend | LLM API integration, answer generation |
| **Aryan Gaur** | AI + Backend | Prompt engineering, answer ranking |
| **Lohit Kumar Pureti** | Full Stack | Search, deployment, integration support |

---

## 🛠️ Technology Stack

* **Frontend**: React.js (Vite) + Tailwind CSS + Lucide Icons
* **Backend API**: Node.js (Express) + SQLite3
* **NLP Service**: Python 3.10+ + Sentence-Transformers (`all-MiniLM-L6-v2`)
* **Scoring Rules**: Upvote-based Time Decay: $Score = \frac{Upvotes + 1}{\sqrt{Hours + 2}}$
* **Similarity Threshold**: Cosine Similarity > `0.85` for automatic merging.

---

## 🚀 Interactive Pipeline Simulator (`integration_test.py`)

To verify the entire 6-stage pipeline before deploying individual services, you can run the interactive CLI integration simulator.

The simulator implements:
1. **SQLite Database Configuration**: Questions, clusters, votes, answers, and published FAQs.
2. **Stage 2 NLP Cosine Similarity**: In-memory token-frequency calculation with clean tokenization.
3. **Stage 3 Priority Logic**: Time-decay math formula that updates scores dynamically.
4. **Stage 4 AI Curation**: Generates automated drafts depending on keywords.
5. **Stage 5 Moderation Panel**: Allows terminal actions to edit, approve, and write to the FAQ.
6. **Stage 6 Search API**: Keyword indexing search across published FAQ pairs.

### How to Run:
Ensure you have Python 3.x installed, then execute:
```bash
python integration_test.py
```

### Simulation Steps:
1. Submit a question like: `"How do I reset my password?"`
2. Submit a very similar question: `"Forgot password, how to change?"` and see the NLP similarity threshold (>0.85) merge it into the existing cluster automatically.
3. Cast upvotes on a cluster and watch the priority queue rearrange itself dynamically.
4. Access the **Moderation Panel**, approve the AI-drafted response, and publish it.
5. Search the published FAQ using keywords like `"password"` to verify public search indexing.
