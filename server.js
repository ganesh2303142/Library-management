const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || path.join(__dirname, 'data', 'books.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readBooks() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeBooks(books) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(books, null, 2), 'utf8');
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/books', (req, res) => {
  const search = (req.query.search || '').toString().trim().toLowerCase();
  const status = (req.query.status || '').toString().trim();
  let books = readBooks();
  if (search) {
    books = books.filter(book =>
      [book.title, book.author, book.isbn].some(value =>
        (value || '').toLowerCase().includes(search)
      )
    );
  }
  if (status) books = books.filter(book => book.status === status);
  res.json(books);
});

app.post('/api/books', (req, res) => {
  const { title, author, isbn } = req.body;
  if (!title || !author || !isbn) {
    return res.status(400).json({ error: 'Title, author, and ISBN are required.' });
  }
  const books = readBooks();
  if (books.some(book => book.isbn.toLowerCase() === isbn.toLowerCase())) {
    return res.status(409).json({ error: 'A book with this ISBN already exists.' });
  }
  const book = {
    id: Date.now().toString(), title: title.trim(), author: author.trim(), isbn: isbn.trim(),
    status: 'available', borrower: null, borrowedAt: null
  };
  books.push(book);
  writeBooks(books);
  res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
  const books = readBooks();
  const index = books.findIndex(book => book.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Book not found.' });
  const { title, author, isbn } = req.body;
  if (!title || !author || !isbn) {
    return res.status(400).json({ error: 'Title, author, and ISBN are required.' });
  }
  books[index] = { ...books[index], title: title.trim(), author: author.trim(), isbn: isbn.trim() };
  writeBooks(books);
  res.json(books[index]);
});

app.delete('/api/books/:id', (req, res) => {
  const books = readBooks();
  const remaining = books.filter(book => book.id !== req.params.id);
  if (remaining.length === books.length) return res.status(404).json({ error: 'Book not found.' });
  writeBooks(remaining);
  res.status(204).end();
});

app.post('/api/books/:id/borrow', (req, res) => {
  const { borrower } = req.body;
  if (!borrower) return res.status(400).json({ error: 'Borrower name is required.' });
  const books = readBooks();
  const book = books.find(item => item.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  if (book.status === 'borrowed') return res.status(409).json({ error: 'Book is already borrowed.' });
  book.status = 'borrowed';
  book.borrower = borrower.trim();
  book.borrowedAt = new Date().toISOString();
  writeBooks(books);
  res.json(book);
});

app.post('/api/books/:id/return', (req, res) => {
  const books = readBooks();
  const book = books.find(item => item.id === req.params.id);
  if (!book) return res.status(404).json({ error: 'Book not found.' });
  book.status = 'available';
  book.borrower = null;
  book.borrowedAt = null;
  writeBooks(books);
  res.json(book);
});

app.get('/api/stats', (_req, res) => {
  const books = readBooks();
  res.json({
    total: books.length,
    available: books.filter(book => book.status === 'available').length,
    borrowed: books.filter(book => book.status === 'borrowed').length
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Library Management running at http://localhost:${PORT}`));
}

module.exports = app;
