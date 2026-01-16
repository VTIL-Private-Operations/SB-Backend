// Some-what good ScriptService

require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.text({ type: "*/*" }));

const db = new sqlite3.Database("./scripts.db");

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL,
      UNIQUE(userId, name)
    )
  `);
});

const AUTH_KEY = process.env.AUTH_KEY || "";

function checkAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== AUTH_KEY) {
    return res.status(401).json({ success: false, result: "Unauthorized" });
  }
  next();
}

app.use(checkAuth);

app.post("/scripts/upload", (req, res) => {
  const { userId, name } = req.query;
  const source = req.body;

  if (!userId || !source) {
    return res.json({ success: false, result: "Missing userId or source" });
  }

  const scriptName = name || `script_${Date.now()}`;

  db.run(
    `INSERT INTO scripts (userId, name, source) VALUES (?, ?, ?)
     ON CONFLICT(userId, name) DO UPDATE SET source=excluded.source`,
    [userId, scriptName, source],
    function (err) {
      if (err) {
        console.error(err);
        return res.json({ success: false, result: "Database error" });
      }
      res.json({ success: true, result: `Uploaded as ${scriptName}` });
    }
  );
});

app.post("/scripts/save", (req, res) => {
  const { userId, name } = req.query;
  const source = req.body;

  if (!userId || !name || !source) {
    return res.send("FAIL");
  }

  db.run(
    `INSERT INTO scripts (userId, name, source) VALUES (?, ?, ?)
     ON CONFLICT(userId, name) DO UPDATE SET source=excluded.source`,
    [userId, name, source],
    function (err) {
      if (err) {
        console.error(err);
        return res.send("FAIL");
      }
      res.send("OK");
    }
  );
});

app.post("/scripts/remove", (req, res) => {
  const { userId, name } = req.query;

  if (!userId || !name) {
    return res.send("FAIL");
  }

  db.run(
    `DELETE FROM scripts WHERE userId = ? AND name = ?`,
    [userId, name],
    function (err) {
      if (err || this.changes === 0) {
        return res.send("FAIL");
      }
      res.send("OK");
    }
  );
});

app.get("/scripts/list", (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.send("FAIL");
  }

  db.all(
    `SELECT name, source FROM scripts WHERE userId = ?`,
    [userId],
    (err, rows) => {
      if (err || rows.length === 0) {
        return res.send("FAIL");
      }

      const result = rows
        .map((row) => `${row.name} ${row.source.replace(/\n/g, "\\n")}`)
        .join("\n");

      res.send(result);
    }
  );
});

app.listen(PORT, () => {
  console.log(`Script service running at http://localhost:${PORT}`);
});
