const { createClient } = require("@libsql/client");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "libsql://jjjj-kingjohnalmlk.aws-ap-northeast-1.turso.io",
  authToken: process.env.TURSO_AUTH_TOKEN || "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg3MDk0MjMsImlkIjoiMDFhMDc3NjMtMDgwMS03MDNmLTg0ZTQtNzI1NGJmYWY2YTkxIiwia2lkIjoidHEzczY5amdRNzdwQjdmRl9fWnh4eHA0OG9CWHA3M0ZjTGh3N2xlMmlIYyIsInJpZCI6ImU4NzdiYmM1LWYwMTgtNGFiMi05MjgyLWFjNTk2NDBlYWE4NCJ9.O3lAKEZ0jbq3bvW7RSNFAoLTqTNdTpgJUY81o1YEDDg1yfSOlHas7QpW9OSPY3hN_ZXqyduHCTHVr1QB4IetAQ"
});

async function initDb() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      text TEXT,
      time TEXT,
      seen_by TEXT DEFAULT ''
    )
  `);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    await initDb();

    if (req.method === 'GET') {
      const rs = await db.execute("SELECT id, sender, text, time, seen_by FROM messages ORDER BY id ASC");
      return res.status(200).json(rs.rows);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      if (body.action === 'seen') {
        await db.execute({
          sql: "UPDATE messages SET seen_by = ? WHERE id = ? AND (seen_by IS NULL OR seen_by = '')",
          args: [body.seen_by, body.id]
        });
        return res.status(200).json({ success: true });
      }

      const { sender, text, time } = body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      await db.execute({
        sql: "INSERT INTO messages (sender, text, time, seen_by) VALUES (?, ?, ?, '')",
        args: [sender || 'مجهول', text, time || '']
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
