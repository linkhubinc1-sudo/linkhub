/**
 * Database using sql.js (pure JavaScript SQLite)
 * Works on Windows without build tools
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'linkhub.db');

let db = null;
let SQL = null;

// Initialize database
async function initDB() {
  if (db) return db;

  SQL = await initSqlJs();

  // Load existing database or create new one
  try {
    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch (e) {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      theme TEXT DEFAULT 'default',
      plan TEXT DEFAULT 'free',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      plan_expires_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      position INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      link_id INTEGER NOT NULL,
      user_agent TEXT,
      referer TEXT,
      country TEXT,
      clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (link_id) REFERENCES links(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_agent TEXT,
      referer TEXT,
      viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Save to disk
  saveDB();

  return db;
}

// Save database to disk
function saveDB() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

// Wrapper to match better-sqlite3 API
const dbWrapper = {
  prepare: (sql) => {
    return {
      run: (...params) => {
        if (!db) throw new Error('Database not initialized');
        db.run(sql, params);
        saveDB();
        return { changes: db.getRowsModified(), lastInsertRowid: getLastInsertId() };
      },
      get: (...params) => {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const row = stmt.getAsObject();
          stmt.free();
          return row;
        }
        stmt.free();
        return undefined;
      },
      all: (...params) => {
        if (!db) throw new Error('Database not initialized');
        const stmt = db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      }
    };
  },
  exec: (sql) => {
    if (!db) throw new Error('Database not initialized');
    db.run(sql);
    saveDB();
  },
  pragma: () => {}, // No-op for compatibility
};

function getLastInsertId() {
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] || 0;
}

// Auto-initialize
initDB().catch(console.error);

// Export wrapper
module.exports = dbWrapper;
module.exports.initDB = initDB;
module.exports.saveDB = saveDB;
