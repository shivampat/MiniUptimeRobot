const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const indexFile = path.join(publicDir, 'index.html');

const server = http.createServer((req, res) => {
  if (req.url !== '/' && req.url !== '/index.html') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found');
    return;
  }

  fs.readFile(indexFile, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal server error');
      return;
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

