const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { createClient } = require('@libsql/client');
const config = require('./config');

const PORT = config.PORT || 8080;
const ROOT = __dirname;

const db = createClient({
  url: config.TURSO_DATABASE_URL,
  authToken: config.TURSO_AUTH_TOKEN
});

db.execute(`
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
`).catch(console.error);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/api/messages') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method === 'GET') {
      db.execute("SELECT id, sender, text, time, seen_by, msg_type, file_data, file_name FROM messages ORDER BY id ASC")
        .then(rs => {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify(rs.rows));
        })
        .catch(err => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        });
      return;
    } else if (req.method === 'DELETE') {
      db.execute("DELETE FROM messages")
        .then(() => {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ success: true }));
        })
        .catch(err => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: err.message }));
        });
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.action === 'seen') {
            db.execute({
              sql: "UPDATE messages SET seen_by = ? WHERE id = ? AND (seen_by IS NULL OR seen_by = '')",
              args: [data.seen_by, data.id]
            })
            .then(() => {
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: true }));
            })
            .catch(err => {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: err.message }));
            });
            return;
          }

          if (!data.text && !data.file_data) {
            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: 'Content required' }));
            return;
          }
          db.execute({
            sql: "INSERT INTO messages (sender, text, time, seen_by, msg_type, file_data, file_name) VALUES (?, ?, ?, '', ?, ?, ?)",
            args: [
              data.sender || 'مجهول',
              data.text || '',
              data.time || '',
              data.msg_type || 'text',
              data.file_data || '',
              data.file_name || ''
            ]
          })
          .then(() => {
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ success: true }));
          })
          .catch(err => {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: err.message }));
          });
        } catch(e) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
      return;
    }
  }

  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  const nets = os.networkInterfaces();
  console.log('server up on port ' + PORT);
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log('Network: http://' + net.address + ':' + PORT);
      }
    }
  }
});
