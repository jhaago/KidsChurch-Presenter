const assert = require('node:assert/strict');
const { NetworkStageServer } = require('../electron/stage-server.cjs');

async function main() {
  const server = new NetworkStageServer({ port: 4390 });
  const info = await server.start();

  assert.equal(info.running, true, info.error || 'Stage server did not start');
  assert.ok(info.port);

  const health = await fetch('http://127.0.0.1:' + info.port + '/health');
  assert.equal(health.status, 200);
  const healthBody = await health.json();
  assert.equal(healthBody.ok, true);

  const unauthorized = await fetch('http://127.0.0.1:' + info.port + '/stage');
  assert.equal(unauthorized.status, 403);

  const authorized = await fetch(
    'http://127.0.0.1:' + info.port + '/stage?token=' + encodeURIComponent(server.token),
  );
  assert.equal(authorized.status, 200);
  const html = await authorized.text();
  assert.match(html, /NETWORK STAGE/);

  server.publish({
    presentationId: 'demo',
    presentationTitle: 'Demo',
    currentSlideId: '1',
    currentText: 'Current',
    nextSlideId: '2',
    nextText: 'Next',
    notes: null,
  });

  await server.stop();
  assert.equal(server.info().running, false);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
