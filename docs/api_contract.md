# Crowd-Sourced FAQ Generation System - API Contract

This document defines the REST API contract between the Frontend, Backend, and NLP-Service components. All endpoints must accept and return JSON payloads.

---

## 1. Questions API

### Submit a Question
Submit a new user question. This endpoint forwards the text to the NLP service to check similarity against existing questions, then either merges it into an existing cluster or creates a new one.

* **URL**: `/api/questions`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "question_text": "How do I reset my password on this platform?",
    "category": "Account Security",
    "user_id": "user_98234"
  }
  ```
* **Success Response (Code 201 Created)**:
  * *Case A (Merged into existing cluster)*:
    ```json
    {
      "success": true,
      "message": "Question received and merged into an existing cluster.",
      "cluster_id": "cluster_abc123",
      "is_new": false
    }
    ```
  * *Case B (Created new cluster)*:
    ```json
    {
      "success": true,
      "message": "Question received. No similar questions found. Started new cluster.",
      "cluster_id": "cluster_xyz789",
      "is_new": true
    }
    ```

### Get Active Question Clusters
Retrieve the list of active (unanswered) question clusters, sorted by priority score.

* **URL**: `/api/questions`
* **Method**: `GET`
* **Success Response (Code 200 OK)**:
  ```json
  [
    {
      "cluster_id": "cluster_abc123",
      "representative_question": "How do I reset my password?",
      "category": "Account Security",
      "upvotes": 14,
      "priority_score": 28.5,
      "created_at": "2026-05-29T10:00:00Z"
    },
    {
      "cluster_id": "cluster_xyz789",
      "representative_question": "Where can I view my monthly invoices?",
      "category": "Billing",
      "upvotes": 4,
      "priority_score": 8.0,
      "created_at": "2026-05-29T11:15:00Z"
    }
  ]
  ```

---

## 2. Community Voting API

### Upvote a Question Cluster
Upvotes increment the priority of a question cluster. The backend will recalculate the cluster's priority score.

* **URL**: `/api/votes`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "cluster_id": "cluster_abc123",
    "user_id": "user_54321"
  }
  ```
* **Success Response (Code 200 OK)**:
  ```json
  {
    "success": true,
    "cluster_id": "cluster_abc123",
    "new_upvote_count": 15,
    "new_priority_score": 30.5
  }
  ```
* **Error Response (Code 400 Bad Request - e.g. User already voted)**:
  ```json
  {
    "success": false,
    "error": "User has already upvoted this question."
  }
  ```

---

## 3. Human Moderation API

### Get Unanswered Questions (Moderator View)
Get question clusters awaiting answers, including the AI-drafted answer if available.

* **URL**: `/api/moderation/unanswered`
* **Method**: `GET`
* **Success Response (Code 200 OK)**:
  ```json
  [
    {
      "cluster_id": "cluster_abc123",
      "representative_question": "How do I reset my password?",
      "category": "Account Security",
      "upvotes": 15,
      "ai_draft_answer": "To reset your password, click on the 'Forgot Password' link on the login page and enter your registered email address. A recovery link will be sent shortly.",
      "community_answers": [
        {
          "answer_id": "ans_001",
          "user_id": "user_expert44",
          "answer_text": "You can also change it in your profile settings if you are already logged in.",
          "upvotes": 2
        }
      ]
    }
  ]
  ```

### Approve and Publish FAQ
Approve an answer (either the AI draft or an edited/custom version) and publish it to the public FAQ page.

* **URL**: `/api/moderation/approve`
* **Method**: `POST`
* **Headers**: `Content-Type: application/json`
* **Request Body**:
  ```json
  {
    "cluster_id": "cluster_abc123",
    "approved_answer": "To reset your password, click on the 'Forgot Password' link on the login page, enter your registered email address, and follow the instructions in the email. Alternatively, log in and change it in Settings -> Security."
  }
  ```
* **Success Response (Code 200 OK)**:
  ```json
  {
    "success": true,
    "message": "Answer approved and published to the public FAQ base.",
    "faq_id": "faq_551"
  }
  ```

---

## 4. Public FAQ API

### Get Published FAQs & Search
Retrieve the published FAQ list. Supports simple text search query parameters.

* **URL**: `/api/faq`
* **Method**: `GET`
* **Query Parameters**:
  * `search` (string, optional) - Keyword search string.
  * `category` (string, optional) - Filter by category tag.
* **Success Response (Code 200 OK)**:
  ```json
  [
    {
      "faq_id": "faq_551",
      "question": "How do I reset my password?",
      "answer": "To reset your password, click on the 'Forgot Password' link on the login page, enter your registered email address, and follow the instructions in the email. Alternatively, log in and change it in Settings -> Security.",
      "category": "Account Security",
      "published_at": "2026-05-29T14:40:00Z"
    }
  ]
  ```
