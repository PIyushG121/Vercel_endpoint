# DSA Mobile Backend API (Vercel Serverless + Hostinger MySQL)

[![Production API](https://img.shields.io/badge/Vercel-Live%20API-brightgreen?style=for-the-badge&logo=vercel)](https://vercel-endpoint-wine.vercel.app/)
[![Database](https://img.shields.io/badge/Hostinger-MySQL%208.0-orange?style=for-the-badge&logo=mysql)](https://hostinger.com)
[![Status](https://img.shields.io/badge/Status-Operational-success?style=for-the-badge)]()

Production-ready, lightweight REST API built with Node.js Serverless Functions on **Vercel** and connected via connection pooling to **Hostinger MySQL**. Tailored specifically for mobile clients (**Flutter**, **React Native**, **Android Kotlin**, **iOS Swift**) for fast feed scrolling, instant caching, and low bandwidth consumption.

---

## 🌐 Live Production Base URL

```text
https://vercel-endpoint-wine.vercel.app
```

---

## 🏗 Architecture

```text
┌─────────────────────────────────────────────────────────┐
│              Mobile APK / App Client                    │
│      (Flutter / React Native / Kotlin / Swift)          │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ HTTPS REST Requests (JSON)
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Vercel Serverless Layer                   │
│        https://vercel-endpoint-wine.vercel.app          │
│       (mysql2 cached connection pool across warm hits)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             │ Remote MySQL (Port 3306)
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Hostinger MySQL Database                  │
│   (dsa_categories, dsa_notes, dsa_questions, links)     │
└─────────────────────────────────────────────────────────┘
```

> **Security Guarantee:** Mobile clients never connect directly to MySQL. All queries are parameterized, sanitized, and served through this secure API layer without exposing database credentials.

---

## 📱 Mobile API Endpoints & Live Links

| Mobile Screen | Method | Endpoint | Query Params | Live Link |
|---|---|---|---|---|
| **Roadmap / Topics** | `GET` | `/api/dsa/topics` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/topics) |
| **Topic Detail** | `GET` | `/api/dsa/topics/{slug}` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/topics/fundamentals) |
| **Questions Feed** | `GET` | `/api/dsa/questions` | `?topic=slug&search=query&page=1&per_page=20` | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/questions?per_page=5) |
| **Question Reader** | `GET` | `/api/dsa/questions/{slug}` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/questions/dsa-tutorial-learn-data-structures-and-algorithms) |
| **Tutorial Notes Feed** | `GET` | `/api/dsa/notes` | `?topic=slug&search=query&page=1&per_page=20` | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/notes?per_page=5) |
| **Note Article Reader** | `GET` | `/api/dsa/notes/{slug}` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/api/dsa/notes/input-and-output-in-programming) |
| **Database Health Check**| `GET` | `/api/health` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/api/health) |
| **API Root Status** | `GET` | `/` | — | [Open Live](https://vercel-endpoint-wine.vercel.app/) |

---

## 📋 JSON Schema Examples

### 1. Roadmap & Categories (`GET /api/dsa/topics`)
```json
{
  "success": true,
  "data": [
    {
      "id": 137,
      "title": "Fundamentals",
      "slug": "fundamentals",
      "total_subtopics": 2,
      "total_items": 13,
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

---

### 2. Paginated Questions Feed (`GET /api/dsa/questions?page=1&per_page=20`)
*(Lightweight payload without full HTML content for fast mobile scrolling)*

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "DSA Tutorial",
      "slug": "dsa-tutorial-learn-data-structures-and-algorithms",
      "topic": "DSA Practice",
      "topic_slug": "dsa-practice",
      "difficulty": "medium",
      "excerpt": "Data Structures and Algorithms Tutorial - A complete guide for beginners...",
      "last_updated": "Recently updated"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 4,
    "per_page": 20,
    "total": 79,
    "has_more": true
  }
}
```

---

### 3. Single Question Reader (`GET /api/dsa/questions/{slug}`)
*(Delivers full HTML article content and source URL for reader screen)*

```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "DSA Tutorial",
    "slug": "dsa-tutorial-learn-data-structures-and-algorithms",
    "topic": "DSA Practice",
    "difficulty": "medium",
    "content_html": "<p>Content HTML body...</p>",
    "source_url": "https://www.geeksforgeeks.org/dsa-tutorial-learn-data-structures-and-algorithms/",
    "last_updated": "Recently updated"
  }
}
```

---

## 🛠 Local Development & Testing

```bash
# 1. Clone the repository
git clone https://github.com/PIyushG121/Vercel_endpoint.git
cd Vercel_endpoint

# 2. Install dependencies
npm install

# 3. Setup environment variables
copy .env.example .env
# Edit .env with your Hostinger database credentials

# 4. Start local development server
npm run dev
# Server runs on http://localhost:3000
```

---

## 🔒 Security & Best Practices

1. **Zero Exposure:** Database credentials, host, and internal connection details are never exposed in responses or client code.
2. **SQL Injection Prevention:** Every query uses parameterized inputs (`?` and `??` identifiers).
3. **Optimized for Mobile Bandwidth:** Feed endpoints omit large HTML blobs and return excerpts, reducing payload sizes from **~2 MB to ~15 KB**.
4. **Infinite Scroll Ready:** `pagination.has_more` simplifies mobile pagination state management.
5. **CORS:** Preflight `OPTIONS` and standard CORS headers configured for cross-platform support.

---

## 🚀 Deployment

The project is continuously deployed to Vercel upon pushing to the `main` branch:

```bash
git add .
git commit -m "Update API"
git push origin main
```
