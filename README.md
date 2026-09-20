# Minimal Vercel Serverless Backend for Hostinger MySQL (DSA Mobile API)

An ultra-lightweight, production-ready REST API designed to run on **Vercel Serverless Functions** and securely connect to an existing **Hostinger MySQL database**, tailored for mobile apps (Flutter, React Native, Kotlin, Swift).

---

## 🏗 Architecture

```text
[ Mobile APK ] (Flutter / React Native / Native)
      │ (HTTPS REST Calls)
      ▼
[ Vercel Serverless API ] (Node.js + mysql2 Connection Pool)
      │ (Remote MySQL Port 3306)
      ▼
[ Hostinger MySQL Database ] (dsa_categories, dsa_notes, dsa_questions, dsa_note_links)
```

---

## 📁 Project Structure

```text
vercel-api/
├── api/
│   └── index.js       # Main serverless request handler & MySQL pool
├── .env.example       # Environment variables template
├── .gitignore         # Ignores .env and node_modules
├── package.json       # Project dependencies & scripts
├── vercel.json        # Vercel serverless rewrite rules
└── README.md          # Full setup and deployment documentation
```

---

## ⚙️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and set environment variables
cp .env.example .env

# 3. Start local development server
npm run dev
```

---

## 📱 Mobile-Optimized API Endpoints

| Screen in Mobile App | Method | Endpoint | Query Params |
|---|---|---|---|
| **Roadmap / Topics Screen** | `GET` | `/api/dsa/topics` | — |
| **Topic Detail (Subsections & Links)** | `GET` | `/api/dsa/topics/{slug}` | — |
| **Questions Feed / Practice Screen** | `GET` | `/api/dsa/questions` | `?topic=slug&difficulty=medium&search=two-sum&page=1&per_page=20` |
| **Question Reader Screen** | `GET` | `/api/dsa/questions/{slug}` | — |
| **Tutorial Notes Feed** | `GET` | `/api/dsa/notes` | `?topic=slug&search=loop&page=1&per_page=20` |
| **Note Article Reader Screen** | `GET` | `/api/dsa/notes/{slug}` | — |
| **Health Check** | `GET` | `/api/health` | — |

---

### JSON Response Examples

#### 1. Roadmap & Hierarchy (`GET /api/dsa/topics`)
```json
{
  "success": true,
  "data": [
    {
      "id": 137,
      "title": "Fundamentals",
      "slug": "fundamentals",
      "total_subtopics": 3,
      "total_items": 15,
      "subtopics": [
        {
          "id": 138,
          "title": "Programming",
          "slug": "programming",
          "total_items": 5,
          "items": [
            {
              "id": 551,
              "note_id": 549,
              "title": "Input and Output",
              "difficulty": "easy",
              "type": "tutorial"
            }
          ]
        }
      ]
    }
  ]
}
```

#### 2. Paginated Questions Feed (`GET /api/dsa/questions?page=1&per_page=20`)
*(Lightweight payload without full HTML content for fast scrolling)*
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Two Sum Problem",
      "slug": "two-sum-problem",
      "topic": "Array & String",
      "topic_slug": "array-string",
      "difficulty": "medium",
      "excerpt": "Given an array of integers nums and an integer target...",
      "last_updated": "26 Mar, 2026"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 15,
    "per_page": 20,
    "total": 300,
    "has_more": true
  }
}
```

#### 3. Single Question Reader (`GET /api/dsa/questions/{slug}`)
*(Delivers full HTML content for reading screen)*
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Two Sum Problem",
    "slug": "two-sum-problem",
    "topic": "Array & String",
    "difficulty": "medium",
    "content_html": "<p>Given an array...</p>",
    "source_url": "https://www.geeksforgeeks.org/...",
    "last_updated": "26 Mar, 2026"
  }
}
```

---

## 🌐 Hostinger Remote MySQL Setup

1. In **Hostinger hPanel** → **Databases** → **Remote MySQL**.
2. Set **IP** to `%` (allow dynamic Vercel IP pool).
3. Select database and click **Create**.

---

## 🚀 Vercel Deployment

```bash
git init
git add .
git commit -m "Deploy Vercel DSA Mobile API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
git push -u origin main
```

Add your environment variables (`DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD`, `CORS_ORIGIN`) in the Vercel dashboard and click **Deploy**.
