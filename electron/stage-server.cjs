const http = require('node:http');
const os = require('node:os');
const crypto = require('node:crypto');

const DEFAULT_PORT = 4310;
const MAX_PORT_ATTEMPTS = 10;

function emptyStageState() {
  return {
    presentationId: null,
    presentationTitle: null,
    currentSlideId: null,
    currentText: null,
    nextSlideId: null,
    nextText: null,
    notes: null,
  };
}

function localIPv4Addresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries || []) {
      if (
        entry.family === 'IPv4' &&
        !entry.internal &&
        entry.address !== '0.0.0.0' &&
        !entry.address.startsWith('169.254.')
      ) {
        addresses.push(entry.address);
      }
    }
  }

  return [...new Set(addresses)];
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stagePage(token) {
  const safeToken = htmlEscape(token);
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="theme-color" content="#090b0e">
  <title>KidsChurch Presenter — Stage</title>
  <style>
    *{box-sizing:border-box}
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#090b0e;color:#f5f7f9;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
    body{display:grid;grid-template-rows:auto 1fr auto}
    header{display:flex;justify-content:space-between;align-items:center;padding:3vh 4vw;border-bottom:1px solid #2a3138;background:#11161c}
    header div{display:flex;flex-direction:column;gap:.5vh}
    small,.label{font-size:clamp(11px,1.4vw,20px);letter-spacing:.14em;color:#75828d;font-weight:800}
    header strong{font-size:clamp(22px,3vw,46px)}
    #connection{text-align:right}
    #connection strong{color:#4bd46b}
    main{display:grid;grid-template-columns:1.15fr .85fr;min-height:0}
    section{padding:5vh 4vw;display:flex;flex-direction:column;gap:3vh}
    .current{border-right:1px solid #2a3138;background:linear-gradient(145deg,#111820,#0b0f14)}
    .next{background:#0d1116}
    .text{flex:1;display:flex;flex-direction:column;justify-content:center;gap:1vh;line-height:1.14}
    .current .text{font-size:clamp(32px,5.7vw,82px);font-weight:720}
    .next .text{font-size:clamp(24px,4vw,58px);font-weight:620;color:#c2c9cf}
    .empty{color:#4d5862}
    footer{display:flex;justify-content:space-between;align-items:center;padding:1.8vh 4vw;border-top:1px solid #2a3138;background:#11161c;color:#7f8a94;font-size:clamp(10px,1.2vw,17px)}
    .offline #connection strong{color:#efb94f}
    @media(max-width:800px) and (orientation:portrait){
      main{grid-template-columns:1fr;grid-template-rows:1fr .72fr}
      .current{border-right:0;border-bottom:1px solid #2a3138}
      section{padding:3vh 5vw;gap:1.5vh}
      .current .text{font-size:clamp(34px,9vw,68px)}
      .next .text{font-size:clamp(25px,7vw,50px)}
    }
  </style>
</head>
<body>
  <header>
    <div>
      <small>CURRENT PRESENTATION</small>
      <strong id="presentation">No live presentation</strong>
    </div>
    <div id="connection">
      <small>NETWORK STAGE</small>
      <strong id="status">CONNECTING</strong>
    </div>
  </header>
  <main>
    <section class="current">
      <div class="label">CURRENT</div>
      <div class="text" id="current"><span class="empty">—</span></div>
    </section>
    <section class="next">
      <div class="label">NEXT</div>
      <div class="text" id="next"><span class="empty">—</span></div>
    </section>
  </main>
  <footer>
    <span id="currentId">No current slide</span>
    <span id="nextId">End of presentation</span>
  </footer>
  <script>
    const token = '${safeToken}';
    const presentation = document.getElementById('presentation');
    const current = document.getElementById('current');
    const next = document.getElementById('next');
    const currentId = document.getElementById('currentId');
    const nextId = document.getElementById('nextId');
    const status = document.getElementById('status');

    function renderLines(element, value) {
      element.replaceChildren();
      if (!value) {
        const empty = document.createElement('span');
        empty.className = 'empty';
        empty.textContent = '—';
        element.appendChild(empty);
        return;
      }
      String(value).split('\\n').forEach((line) => {
        const span = document.createElement('span');
        span.textContent = line;
        element.appendChild(span);
      });
    }

    function render(state) {
      presentation.textContent = state.presentationTitle || 'No live presentation';
      renderLines(current, state.currentText);
      renderLines(next, state.nextText);
      currentId.textContent = state.currentSlideId || 'No current slide';
      nextId.textContent = state.nextSlideId ? 'Next: ' + state.nextSlideId : 'End of presentation';
    }

    const events = new EventSource('/stage/events?token=' + encodeURIComponent(token));
    events.onopen = () => {
      document.body.classList.remove('offline');
      status.textContent = 'CONNECTED';
    };
    events.onmessage = (event) => {
      try { render(JSON.parse(event.data)); } catch {}
    };
    events.onerror = () => {
      document.body.classList.add('offline');
      status.textContent = 'RECONNECTING';
    };
  </script>
</body>
</html>`;
}

class NetworkStageServer {
  constructor(options = {}) {
    this.preferredPort = options.port || DEFAULT_PORT;
    this.token = crypto.randomBytes(12).toString('hex');
    this.server = null;
    this.port = null;
    this.clients = new Set();
    this.stageState = emptyStageState();
    this.lastError = null;
    this.infoListeners = new Set();
  }

  onInfo(listener) {
    this.infoListeners.add(listener);
    listener(this.info());
    return () => this.infoListeners.delete(listener);
  }

  emitInfo() {
    const info = this.info();
    for (const listener of this.infoListeners) listener(info);
  }

  info() {
    const urls = this.port
      ? localIPv4Addresses().map(
          (address) => 'http://' + address + ':' + this.port + '/stage?token=' + this.token,
        )
      : [];

    return {
      running: Boolean(this.server && this.port),
      port: this.port,
      urls,
      clientCount: this.clients.size,
      error: this.lastError,
    };
  }

  authorized(requestUrl) {
    try {
      const parsed = new URL(requestUrl, 'http://localhost');
      return parsed.searchParams.get('token') === this.token;
    } catch {
      return false;
    }
  }

  handleRequest(req, res) {
    const parsed = new URL(req.url || '/', 'http://localhost');

    if (parsed.pathname === '/health') {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      });
      res.end(JSON.stringify({ ok: true, service: 'KidsChurch Presenter Network Stage' }));
      return;
    }

    if (parsed.pathname === '/stage') {
      if (!this.authorized(req.url)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Invalid or missing Stage session token.');
        return;
      }

      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      res.end(stagePage(this.token));
      return;
    }

    if (parsed.pathname === '/stage/events') {
      if (!this.authorized(req.url)) {
        res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Invalid or missing Stage session token.');
        return;
      }

      res.writeHead(200, {
        'content-type': 'text/event-stream',
        'cache-control': 'no-store',
        connection: 'keep-alive',
        'x-accel-buffering': 'no',
      });
      res.write('retry: 1500\\n');
      res.write('data: ' + JSON.stringify(this.stageState) + '\\n\\n');

      this.clients.add(res);
      this.emitInfo();

      const keepAlive = setInterval(() => {
        if (!res.destroyed) res.write(': keep-alive\\n\\n');
      }, 15000);

      req.on('close', () => {
        clearInterval(keepAlive);
        this.clients.delete(res);
        this.emitInfo();
      });
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }

  async start() {
    if (this.server) return this.info();

    for (let attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt += 1) {
      const port = this.preferredPort + attempt;
      const server = http.createServer((req, res) => this.handleRequest(req, res));

      const result = await new Promise((resolve) => {
        const onError = (error) => {
          server.removeListener('listening', onListening);
          resolve({ ok: false, error });
        };
        const onListening = () => {
          server.removeListener('error', onError);
          resolve({ ok: true });
        };
        server.once('error', onError);
        server.once('listening', onListening);
        server.listen(port, '0.0.0.0');
      });

      if (result.ok) {
        this.server = server;
        this.port = port;
        this.lastError = null;
        this.emitInfo();
        return this.info();
      }

      server.close();
      if (result.error?.code !== 'EADDRINUSE') {
        this.lastError = result.error?.message || String(result.error);
        this.emitInfo();
        return this.info();
      }
    }

    this.lastError =
      'No available Stage server port between ' +
      this.preferredPort +
      ' and ' +
      (this.preferredPort + MAX_PORT_ATTEMPTS - 1) +
      '.';
    this.emitInfo();
    return this.info();
  }

  publish(stageState) {
    this.stageState = stageState || emptyStageState();
    const payload = 'data: ' + JSON.stringify(this.stageState) + '\\n\\n';

    for (const client of [...this.clients]) {
      if (client.destroyed) {
        this.clients.delete(client);
        continue;
      }
      client.write(payload);
    }
  }

  async stop() {
    for (const client of this.clients) client.end();
    this.clients.clear();

    if (!this.server) {
      this.port = null;
      this.emitInfo();
      return;
    }

    const server = this.server;
    this.server = null;
    this.port = null;

    await new Promise((resolve) => server.close(resolve));
    this.emitInfo();
  }
}

module.exports = { NetworkStageServer };
