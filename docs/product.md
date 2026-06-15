# Product Specification: Crowd-Sourced FAQ Management System

This document outlines the product features, user portals, and system requirements, with a special focus on the **Dual-Database Failover Resiliency** architecture.

---

## 1. User Portals & Workspaces

The platform is divided into two primary environments tailored to different user roles: the **User Q&A Portal** and the **Admin Control Tower**.

### A. User Q&A Portal
Designed to support fast, automated self-service and community participation:
1. **Verified FAQ Search Feed**: Browse published knowledge base entries, view counts, and perform keyword filtering.
2. **Conversational AI Q&A Assistant**: An interactive chat interface that uses vector similarity to map user questions directly to verified published FAQ pairs, offering human-like step-by-step guidance.
3. **Real-Time NLP Deduplication Widget**: As a user types a new question, a live widget shows similarity percentages against existing open topics to encourage merging and prevent duplicates.
4. **Curation Voting Queue (Quora-Style)**: Upvote open topics to prioritize them and submit collaborative answer drafts.

### B. Admin Control Tower
Designed for team administrators and expert curators (unlocked via the passcode `admin`):
1. **Expert Curation Queue**: A prioritized dashboard sorting unresolved questions by their recency-decay score.
2. **Human-in-the-Loop Curation Box**: Edit AI-generated drafts or community drafts before publishing them as verified FAQ pairs.
3. **AI prompt Playground**: Sliders to adjust temperature, cosine similarity thresholds, and recency-decay exponents.
4. **Live System Diagnostics & Audit Logs**: Real-time logging of all pipeline activity (submits, votes, merges, publishes) alongside CPU, RAM, and database metrics.

---

## 2. Product Resiliency SLA & Dual-Database Failover (Unique Feature)

To guarantee uninterrupted service and 100% database uptime for both public users and admin moderators, the product implements a **Dual-Database Failover system**:

> [!IMPORTANT]
> **Resiliency Specification (Automated Failover)**
> - **Primary Database**: `database.sqlite` (stores active state, clusters, questions, answers, votes, and published FAQs).
> - **Secondary (Backup) Database**: `database_backup.sqlite` (hot standby file).
> - **Failover Logic**: 
>   If the primary database encounters an access issue, disk I/O error, table lock, or corruption (e.g. `SQLITE_BUSY`, `SQLITE_LOCKED`, `SQLITE_CORRUPT`), the backend database wrapper:
>   1. Logs a high-priority warning audit trail entry.
>   2. Instantly switches the connection reference to the backup database file (`database_backup.sqlite`).
>   3. Automates standard table initialization and seeds schema structures on the backup file if they do not exist.
>   4. Transparently retries the interrupted database request on the backup connection.
>   5. Routes all subsequent reads/writes to the backup database to prevent database disruption.

---

## 3. Product Performance & Thresholds

- **NLP Similarity Threshold**: Default `0.85` (adjustable in Admin playground). Below this, questions seed new clusters; above this, they merge into existing ones.
- **Priority Decay Exponent ($\lambda$)**: Default `0.5` (adjustable). Governs how fast old questions lose priority compared to new votes.
- **Failover Threshold**: < 100ms switchover latency upon database query exception.
