const { createClient } = require("@libsql/client");

const db = createClient({
  url: "libsql://jjjj-kingjohnalmlk.aws-ap-northeast-1.turso.io",
  authToken: "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODg3MDk0MjMsImlkIjoiMDFhMDc3NjMtMDgwMS03MDNmLTg0ZTQtNzI1NGJmYWY2YTkxIiwia2lkIjoidHEzczY5amdRNzdwQjdmRl9fWnh4eHA0OG9CWHA3M0ZjTGh3N2xlMmlIYyIsInJpZCI6ImU4NzdiYmM1LWYwMTgtNGFiMi05MjgyLWFjNTk2NDBlYWE4NCJ9.O3lAKEZ0jbq3bvW7RSNFAoLTqTNdTpgJUY81o1YEDDg1yfSOlHas7QpW9OSPY3hN_ZXqyduHCTHVr1QB4IetAQ",
});

async function initDb() {
  if (!db) {
    throw new Error("Database client was not initialized");
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT,
      text TEXT,
      time TEXT,
      seen_by TEXT DEFAULT '',
      msg_type TEXT DEFAULT 'text',
      file_data TEXT DEFAULT '',
      file_name TEXT DEFAULT ''
    )
  `);
}

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // Initialize database
    await initDb();

    // GET - Get all messages
    if (req.method === "GET") {
      const rs = await db.execute(`
        SELECT
          id,
          sender,
          text,
          time,
          seen_by,
          msg_type,
          file_data,
          file_name
        FROM messages
        ORDER BY id ASC
      `);

      return res.status(200).json(rs.rows);
    }

    // DELETE - Delete all messages
    if (req.method === "DELETE") {
      await db.execute("DELETE FROM messages");

      return res.status(200).json({
        success: true,
      });
    }

    // POST - Add message / mark as seen
    if (req.method === "POST") {
      const body = req.body || {};

      // Mark message as seen
      if (body.action === "seen") {
        await db.execute({
          sql: `
            UPDATE messages
            SET seen_by = ?
            WHERE id = ?
              AND (seen_by IS NULL OR seen_by = '')
          `,
          args: [body.seen_by, body.id],
        });

        return res.status(200).json({
          success: true,
        });
      }

      // Require text or file
      if (!body.text && !body.file_data) {
        return res.status(400).json({
          error: "Content required",
        });
      }

      // Insert message
      await db.execute({
        sql: `
          INSERT INTO messages
          (
            sender,
            text,
            time,
            seen_by,
            msg_type,
            file_data,
            file_name
          )
          VALUES (?, ?, ?, '', ?, ?, ?)
        `,
        args: [
          body.sender || "مجهول",
          body.text || "",
          body.time || "",
          body.msg_type || "text",
          body.file_data || "",
          body.file_name || "",
        ],
      });

      return res.status(200).json({
        success: true,
      });
    }

    // Unsupported method
    return res.status(405).json({
      error: "Method not allowed",
    });
  } catch (err) {
    console.error("API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
};