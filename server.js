const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME = {
  '.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg',
  '.wav':'audio/wav','.ogg':'audio/ogg'
};

http.createServer((req, res) => {
  let file = req.url === '/' ? '/index.html' : req.url;
  file = path.join(__dirname, file);
  const ext = path.extname(file);
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
