const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('./database.sqlite');

app.use(cors());
app.use(bodyParser.json());

// 初期化
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_code TEXT UNIQUE,
    password TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    is_important INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

// ログイン
app.post('/api/auth/login', (req, res) => {
  const { owner_code, password } = req.body;
  db.get("SELECT * FROM users WHERE owner_code = ?", [owner_code], (err, user) => {
    if (err) return res.status(500).json({ error: err });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    bcrypt.compare(password, user.password, (err, same) => {
      if (same) res.json({ success: true });
      else res.status(401).json({ error: "Invalid credentials" });
    });
  });
});

// メッセージ一覧
app.get('/api/messages', (req, res) => {
  db.all("SELECT * FROM messages ORDER BY created_at DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err });
    res.json(rows);
  });
});

// メッセージ投稿
app.post('/api/messages', (req, res) => {
  const { title, content } = req.body;
  db.run("INSERT INTO messages (title, content) VALUES (?, ?)", [title, content], function(err) {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true, id: this.lastID });
  });
});

// 既読
app.patch('/api/messages/:id/read', (req, res) => {
  db.run("UPDATE messages SET is_read = 1 WHERE id = ?", [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

// 重要
app.patch('/api/messages/:id/important', (req, res) => {
  const { is_important } = req.body;
  db.run("UPDATE messages SET is_important = ? WHERE id = ?", [is_important, req.params.id], function(err) {
    if (err) return res.status(500).json({ error: err });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
