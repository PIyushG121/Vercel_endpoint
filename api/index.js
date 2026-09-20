/**
 * Vercel Serverless Backend API connecting to Hostinger MySQL
 * Optimized for Mobile APKs (Flutter, React Native, Kotlin, Swift)
 * 
 * Architecture: Mobile APK -> Vercel Serverless API -> Hostinger MySQL
 */

// Load local environment variables if not running in production/Vercel
require('dotenv').config();

const mysql = require('mysql2/promise');
const http = require('http');

// ==========================================
// CORS & CONFIGURATION
// ==========================================

const ALLOWED_ORIGIN = process.env.CORS_ORIGIN || '*';
const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';

// ==========================================
// DATABASE CONNECTION POOL (SINGLETON)
// ==========================================

let pool = null;

function getDbPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60000,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
    });
  }
  return pool;
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function sendJson(res, statusCode, data) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.end(JSON.stringify(data));
}

function generateExcerpt(text, length = 180) {
  if (!text) return '';
  // Strip HTML tags
  const clean = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return clean.length > length ? clean.substring(0, length) + '...' : clean;
}

// ==========================================
// ROUTE HANDLERS
// ==========================================

/**
 * GET /api/dsa/topics
 * Returns complete roadmap / topic hierarchy
 */
async function getTopics(req, res, parsedUrl) {
  const db = getDbPool();

  // 1. Fetch parent categories
  const [categories] = await db.query(`
    SELECT id, name as title, slug, sort_order 
    FROM dsa_categories 
    WHERE parent_id IS NULL 
    ORDER BY sort_order ASC, id ASC
  `);

  // 2. Fetch all subcategories
  const [subcategories] = await db.query(`
    SELECT id, name as title, slug, parent_id, sort_order 
    FROM dsa_categories 
    WHERE parent_id IS NOT NULL 
    ORDER BY sort_order ASC, id ASC
  `);

  // 3. Fetch all note links for subcategories
  const [links] = await db.query(`
    SELECT id, category_id, title, sort_order, difficulty, type, url, note_id
    FROM dsa_note_links
    ORDER BY sort_order ASC, id ASC
  `);

  // Group links by category_id
  const linksByCat = {};
  links.forEach(link => {
    if (!linksByCat[link.category_id]) linksByCat[link.category_id] = [];
    linksByCat[link.category_id].push({
      id: link.id,
      note_id: link.note_id,
      title: link.title,
      difficulty: link.difficulty || 'easy',
      type: link.type || 'tutorial'
    });
  });

  // Group subcategories by parent_id
  const subsByParent = {};
  subcategories.forEach(sub => {
    const subItems = linksByCat[sub.id] || [];
    const subObj = {
      id: sub.id,
      title: sub.title,
      slug: sub.slug,
      total_items: subItems.length,
      items: subItems
    };
    if (!subsByParent[sub.parent_id]) subsByParent[sub.parent_id] = [];
    subsByParent[sub.parent_id].push(subObj);
  });

  // Assemble full hierarchy
  const data = categories.map(cat => {
    const subs = subsByParent[cat.id] || [];
    const totalItems = subs.reduce((acc, s) => acc + s.total_items, 0);
    return {
      id: cat.id,
      title: cat.title,
      slug: cat.slug,
      total_subtopics: subs.length,
      total_items: totalItems,
      subtopics: subs
    };
  });

  return sendJson(res, 200, {
    success: true,
    data
  });
}

/**
 * GET /api/dsa/topics/:slug
 * Returns specific topic and its subtopics
 */
async function getTopicBySlug(req, res, slug) {
  const db = getDbPool();

  const [categories] = await db.query(
    'SELECT id, name as title, slug FROM dsa_categories WHERE slug = ? OR id = ? LIMIT 1',
    [slug, parseInt(slug, 10) || 0]
  );

  if (!categories.length) {
    return sendJson(res, 404, { success: false, message: 'Topic not found' });
  }

  const topic = categories[0];

  const [subcategories] = await db.query(`
    SELECT id, name as title, slug, sort_order 
    FROM dsa_categories 
    WHERE parent_id = ? 
    ORDER BY sort_order ASC, id ASC
  `, [topic.id]);

  const [links] = await db.query(`
    SELECT id, category_id, title, sort_order, difficulty, type, note_id
    FROM dsa_note_links
    WHERE category_id IN (SELECT id FROM dsa_categories WHERE parent_id = ? OR id = ?)
    ORDER BY sort_order ASC, id ASC
  `, [topic.id, topic.id]);

  const linksByCat = {};
  links.forEach(link => {
    if (!linksByCat[link.category_id]) linksByCat[link.category_id] = [];
    linksByCat[link.category_id].push({
      id: link.id,
      note_id: link.note_id,
      title: link.title,
      difficulty: link.difficulty || 'easy',
      type: link.type || 'tutorial'
    });
  });

  const subtopics = subcategories.map(sub => {
    const items = linksByCat[sub.id] || [];
    return {
      id: sub.id,
      title: sub.title,
      slug: sub.slug,
      total_items: items.length,
      items
    };
  });

  const totalItems = subtopics.reduce((acc, s) => acc + s.total_items, 0) + (linksByCat[topic.id] || []).length;

  return sendJson(res, 200, {
    success: true,
    data: {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
      total_subtopics: subtopics.length,
      total_items: totalItems,
      subtopics,
      items: linksByCat[topic.id] || []
    }
  });
}

/**
 * GET /api/dsa/questions
 * Paginated questions list (lightweight without heavy HTML content)
 */
async function getQuestions(req, res, parsedUrl) {
  const db = getDbPool();

  const page = Math.max(parseInt(parsedUrl.searchParams.get('page'), 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('per_page'), 10) || 20, 1), 100);
  const offset = (page - 1) * perPage;

  const topicParam = parsedUrl.searchParams.get('topic');
  const searchParam = parsedUrl.searchParams.get('search');

  let whereClauses = [];
  let queryParams = [];

  if (searchParam) {
    whereClauses.push('(q.title LIKE ? OR q.slug LIKE ?)');
    queryParams.push(`%${searchParam}%`, `%${searchParam}%`);
  }

  if (topicParam) {
    whereClauses.push('(c.slug = ? OR c.name = ? OR q.category_id = ?)');
    queryParams.push(topicParam, topicParam, parseInt(topicParam, 10) || 0);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  // Count total matching items
  const [countRows] = await db.query(`
    SELECT COUNT(*) as total
    FROM dsa_questions q
    LEFT JOIN dsa_categories c ON q.category_id = c.id
    ${whereSql}
  `, queryParams);

  const total = countRows[0].total;
  const lastPage = Math.ceil(total / perPage) || 1;

  // Fetch paginated records (omitting large `content` for fast mobile payload)
  const [rows] = await db.query(`
    SELECT 
      q.id,
      q.title,
      q.slug,
      q.last_updated,
      c.name as topic,
      c.slug as topic_slug,
      SUBSTRING(q.content, 1, 200) as raw_snippet
    FROM dsa_questions q
    LEFT JOIN dsa_categories c ON q.category_id = c.id
    ${whereSql}
    ORDER BY q.id ASC
    LIMIT ? OFFSET ?
  `, [...queryParams, perPage, offset]);

  const data = rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    topic: r.topic || 'DSA Practice',
    topic_slug: r.topic_slug || 'dsa-practice',
    difficulty: 'medium',
    excerpt: generateExcerpt(r.raw_snippet),
    last_updated: r.last_updated || 'Recently updated'
  }));

  return sendJson(res, 200, {
    success: true,
    data,
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
      has_more: page < lastPage
    }
  });
}

/**
 * GET /api/dsa/questions/:slug
 * Full question content & reader screen detail
 */
async function getQuestionDetail(req, res, slug) {
  const db = getDbPool();

  const [rows] = await db.query(`
    SELECT 
      q.id,
      q.title,
      q.slug,
      q.content as content_html,
      q.url as source_url,
      q.last_updated,
      c.name as topic
    FROM dsa_questions q
    LEFT JOIN dsa_categories c ON q.category_id = c.id
    WHERE q.slug = ? OR q.id = ?
    LIMIT 1
  `, [slug, parseInt(slug, 10) || 0]);

  if (!rows.length) {
    return sendJson(res, 404, { success: false, message: 'Question not found' });
  }

  const item = rows[0];

  return sendJson(res, 200, {
    success: true,
    data: {
      id: item.id,
      title: item.title,
      slug: item.slug,
      topic: item.topic || 'DSA Practice',
      difficulty: 'medium',
      content_html: item.content_html || '',
      source_url: item.source_url || '',
      last_updated: item.last_updated || 'Recently updated'
    }
  });
}

/**
 * GET /api/dsa/notes
 * Paginated tutorial notes feed
 */
async function getNotes(req, res, parsedUrl) {
  const db = getDbPool();

  const page = Math.max(parseInt(parsedUrl.searchParams.get('page'), 10) || 1, 1);
  const perPage = Math.min(Math.max(parseInt(parsedUrl.searchParams.get('per_page'), 10) || 20, 1), 100);
  const offset = (page - 1) * perPage;

  const topicParam = parsedUrl.searchParams.get('topic');
  const searchParam = parsedUrl.searchParams.get('search');

  let whereClauses = [];
  let queryParams = [];

  if (searchParam) {
    whereClauses.push('(n.title LIKE ? OR n.slug LIKE ?)');
    queryParams.push(`%${searchParam}%`, `%${searchParam}%`);
  }

  if (topicParam) {
    whereClauses.push('(c.slug = ? OR c.name = ? OR n.category_id = ?)');
    queryParams.push(topicParam, topicParam, parseInt(topicParam, 10) || 0);
  }

  const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const [countRows] = await db.query(`
    SELECT COUNT(*) as total
    FROM dsa_notes n
    LEFT JOIN dsa_categories c ON n.category_id = c.id
    ${whereSql}
  `, queryParams);

  const total = countRows[0].total;
  const lastPage = Math.ceil(total / perPage) || 1;

  const [rows] = await db.query(`
    SELECT 
      n.id,
      n.title,
      n.slug,
      n.excerpt,
      n.last_updated,
      c.name as topic,
      c.slug as topic_slug
    FROM dsa_notes n
    LEFT JOIN dsa_categories c ON n.category_id = c.id
    ${whereSql}
    ORDER BY n.id ASC
    LIMIT ? OFFSET ?
  `, [...queryParams, perPage, offset]);

  const data = rows.map(r => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    topic: r.topic || 'DSA Tutorial',
    topic_slug: r.topic_slug || 'dsa-tutorial',
    excerpt: r.excerpt || '',
    last_updated: r.last_updated || 'Recently updated'
  }));

  return sendJson(res, 200, {
    success: true,
    data,
    pagination: {
      current_page: page,
      last_page: lastPage,
      per_page: perPage,
      total,
      has_more: page < lastPage
    }
  });
}

/**
 * GET /api/dsa/notes/:slug
 * Full tutorial note detail / article reader
 */
async function getNoteDetail(req, res, slug) {
  const db = getDbPool();

  const [rows] = await db.query(`
    SELECT 
      n.id,
      n.title,
      n.slug,
      n.content as content_html,
      n.url as source_url,
      n.last_updated,
      c.name as topic
    FROM dsa_notes n
    LEFT JOIN dsa_categories c ON n.category_id = c.id
    WHERE n.slug = ? OR n.id = ?
    LIMIT 1
  `, [slug, parseInt(slug, 10) || 0]);

  if (!rows.length) {
    return sendJson(res, 404, { success: false, message: 'Note not found' });
  }

  const item = rows[0];

  return sendJson(res, 200, {
    success: true,
    data: {
      id: item.id,
      title: item.title,
      slug: item.slug,
      topic: item.topic || 'DSA Tutorial',
      content_html: item.content_html || '',
      source_url: item.source_url || '',
      last_updated: item.last_updated || 'Recently updated'
    }
  });
}

// ==========================================
// MAIN DISPATCHER HANDLER
// ==========================================

async function handler(req, res) {
  // 1. Handle CORS Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname.replace(/\/$/, '') || '/';
  const method = req.method ? req.method.toUpperCase() : 'GET';

  try {
    // ------------------------------------------------------------------
    // BASE HEALTH & TEST ENDPOINTS
    // ------------------------------------------------------------------
    if (pathname === '/' && method === 'GET') {
      return sendJson(res, 200, { success: true, message: 'API is running' });
    }

    if (pathname === '/api/health' && method === 'GET') {
      try {
        const db = getDbPool();
        await db.query('SELECT 1');
        return sendJson(res, 200, { success: true, database: 'connected' });
      } catch (dbErr) {
        console.error('[Health Check DB Error]:', dbErr.message);
        return sendJson(res, 503, { success: false, database: 'disconnected' });
      }
    }

    if (pathname === '/api/test' && method === 'GET') {
      try {
        const db = getDbPool();
        await db.query('SELECT 1 as test');
        return sendJson(res, 200, { success: true });
      } catch (dbErr) {
        console.error('[Test Endpoint DB Error]:', dbErr.message);
        return sendJson(res, 500, { success: false, message: 'Database query failed' });
      }
    }

    // ------------------------------------------------------------------
    // MOBILE DSA ROADMAP & TOPICS
    // ------------------------------------------------------------------
    if (pathname === '/api/dsa/topics' && method === 'GET') {
      return await getTopics(req, res, parsedUrl);
    }

    const topicMatch = pathname.match(/^\/api\/dsa\/topics\/([^/]+)$/);
    if (topicMatch && method === 'GET') {
      return await getTopicBySlug(req, res, decodeURIComponent(topicMatch[1]));
    }

    // ------------------------------------------------------------------
    // MOBILE DSA QUESTIONS
    // ------------------------------------------------------------------
    if (pathname === '/api/dsa/questions' && method === 'GET') {
      return await getQuestions(req, res, parsedUrl);
    }

    const questionMatch = pathname.match(/^\/api\/dsa\/questions\/([^/]+)$/);
    if (questionMatch && method === 'GET') {
      return await getQuestionDetail(req, res, decodeURIComponent(questionMatch[1]));
    }

    // ------------------------------------------------------------------
    // MOBILE DSA NOTES
    // ------------------------------------------------------------------
    if (pathname === '/api/dsa/notes' && method === 'GET') {
      return await getNotes(req, res, parsedUrl);
    }

    const noteMatch = pathname.match(/^\/api\/dsa\/notes\/([^/]+)$/);
    if (noteMatch && method === 'GET') {
      return await getNoteDetail(req, res, decodeURIComponent(noteMatch[1]));
    }

    // ------------------------------------------------------------------
    // 404 - Not Found
    // ------------------------------------------------------------------
    return sendJson(res, 404, { success: false, message: 'Endpoint not found' });

  } catch (err) {
    console.error('[Server Error]:', err.message);
    return sendJson(res, 500, { success: false, message: 'Internal server error' });
  }
}

// Export for Vercel Serverless Function
module.exports = handler;

// ==========================================
// LOCAL DEVELOPMENT SERVER
// ==========================================
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`\n🚀 Server running locally on http://localhost:${PORT}`);
    console.log(`📌 GET http://localhost:${PORT}/api/dsa/topics`);
    console.log(`📌 GET http://localhost:${PORT}/api/dsa/questions?page=1&per_page=10`);
    console.log(`📌 GET http://localhost:${PORT}/api/dsa/notes?page=1&per_page=10\n`);
  });
}
