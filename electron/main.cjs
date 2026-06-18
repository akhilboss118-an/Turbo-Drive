const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

const PORT = 0; // random available port
let mainWindow, server;

const MIME = {
  '.html':'text/html','.js':'text/javascript','.css':'text/css',
  '.png':'image/png','.jpg':'image/jpeg','.gif':'image/gif',
  '.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon',
  '.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg',
  '.wav':'audio/wav','.ogg':'audio/ogg','.glb':'model/gltf-binary',
  '.gltf':'model/gltf+json','.hdr':'image/vnd.radiance','.wasm':'application/wasm'
};

function createServer() {
  const wwwroot = path.join(__dirname, '..');
  server = http.createServer((req, res) => {
    let file = req.url === '/' ? '/index.html' : req.url;
    file = path.join(wwwroot, file);
    const ext = path.extname(file);
    fs.readFile(file, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('Not found');
      }
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      resolve(server.address().port);
    });
  });
}

async function createWindow() {
  const port = await createServer();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: false,
    resizable: true,
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon-512x512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.setTitle('Turbo Drive');
  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
