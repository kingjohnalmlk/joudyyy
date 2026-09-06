const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const MESSAGES_FILE = path.join(ROOT, 'messages.json');

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
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);

  if (urlPath === '/api/messages') {
    if (req.method === 'GET') {
      fs.readFile(MESSAGES_FILE, 'utf8', (err, data) => {
        if (err) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify([]));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(data || '[]');
      });
      return;
    } else if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const newMsg = JSON.parse(body);
          fs.readFile(MESSAGES_FILE, 'utf8', (err, data) => {
            let messages = [];
            if (!err && data) {
              try { messages = JSON.parse(data); } catch(e){}
            }
            messages.push({
              sender: newMsg.sender || 'مجهول',
              text: newMsg.text || '',
              time: newMsg.time || new Date().toLocaleTimeString('ar-EG', {hour: '2-digit', minute:'2-digit'})
            });
            fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2), 'utf8', (err2) => {
              if (err2) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: 'Failed to save' }));
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ success: true }));
            });
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

server.listen(PORT, () => {
  console.log('server up on port ' + PORT);
});

function getLANIP() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

setTimeout(() => {
  const ip = getLANIP();
  console.log('\n-----------------------------------------');
  console.log('  الموقع جاهز على موبايلك!');
  console.log('  من نفس الواي فاي افتح:');
  console.log('  http://' + ip + ':' + PORT);
  console.log('-----------------------------------------\n');
}, 300);
