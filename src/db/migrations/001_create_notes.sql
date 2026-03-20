CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL CHECK(length(title) >= 1 AND length(title) <= 255),
  body TEXT NOT NULL CHECK(length(body) >= 1),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
