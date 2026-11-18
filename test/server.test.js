const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

process.env.DATA_FILE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'library-')), 'books.json');
const app = require('../server');

let server;
let baseUrl;

test.before(async () => {
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

test.after(() => server.close());

test('health endpoint reports status', async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});

test('book can be created, borrowed, returned, and deleted', async () => {
  const create = await fetch(`${baseUrl}/api/books`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'The Library', author: 'A. Reader', isbn: '978-test' })
  });
  assert.equal(create.status, 201);
  const book = await create.json();

  const borrow = await fetch(`${baseUrl}/api/books/${book.id}/borrow`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ borrower: 'Sam' })
  });
  assert.equal(borrow.status, 200);
  assert.equal((await borrow.json()).status, 'borrowed');

  const returned = await fetch(`${baseUrl}/api/books/${book.id}/return`, { method: 'POST' });
  assert.equal(returned.status, 200);
  assert.equal((await returned.json()).status, 'available');

  const remove = await fetch(`${baseUrl}/api/books/${book.id}`, { method: 'DELETE' });
  assert.equal(remove.status, 204);
});
