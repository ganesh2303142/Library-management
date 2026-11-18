const grid = document.querySelector('#bookGrid');
const bookDialog = document.querySelector('#bookDialog');
const borrowDialog = document.querySelector('#borrowDialog');
const bookForm = document.querySelector('#bookForm');
const borrowForm = document.querySelector('#borrowForm');
let editingId = null;

async function api(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || 'Request failed');
  }
  return response.status === 204 ? null : response.json();
}

function toast(message) {
  const element = document.querySelector('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2200);
}

async function load() {
  const [books, stats] = await Promise.all([
    api(`/api/books?search=${encodeURIComponent(document.querySelector('#search').value)}&status=${document.querySelector('#statusFilter').value}`),
    api('/api/stats')
  ]);
  document.querySelector('#totalBooks').textContent = stats.total;
  document.querySelector('#availableBooks').textContent = stats.available;
  document.querySelector('#borrowedBooks').textContent = stats.borrowed;
  grid.innerHTML = books.length ? books.map(book => `
    <article class="book">
      <h3>${escapeHtml(book.title)}</h3>
      <p>by ${escapeHtml(book.author)}</p>
      <p>ISBN ${escapeHtml(book.isbn)}</p>
      ${book.status === 'borrowed' ? `<p>Borrowed by ${escapeHtml(book.borrower)}</p>` : ''}
      <span class="badge ${book.status}">${book.status}</span>
      <div class="card-actions">
        ${book.status === 'available'
          ? `<button class="secondary" onclick="openBorrow('${book.id}')">Borrow</button>`
          : `<button class="secondary" onclick="returnBook('${book.id}')">Return</button>`}
        <button class="secondary" onclick="editBook('${book.id}', ${JSON.stringify(book).replaceAll('"', '&quot;')})">Edit</button>
        <button class="danger" onclick="deleteBook('${book.id}')">Delete</button>
      </div>
    </article>`).join('') : '<div class="empty">No books found</div>';
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value || ''; return div.innerHTML; }

document.querySelector('#newBookButton').addEventListener('click', () => { editingId = null; bookForm.reset(); document.querySelector('#dialogTitle').textContent = 'Add a book'; bookDialog.showModal(); });
document.querySelector('#cancelButton').addEventListener('click', () => bookDialog.close());
document.querySelector('#borrowCancel').addEventListener('click', () => borrowDialog.close());
document.querySelector('#search').addEventListener('input', load);
document.querySelector('#statusFilter').addEventListener('change', load);

bookForm.addEventListener('submit', async event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(bookForm));
  try {
    if (editingId) await api(`/api/books/${editingId}`, { method: 'PUT', body: JSON.stringify(data) });
    else await api('/api/books', { method: 'POST', body: JSON.stringify(data) });
    bookDialog.close(); toast(editingId ? 'Book updated' : 'Book added'); await load();
  } catch (error) { toast(error.message); }
});

window.editBook = (id, book) => { editingId = id; bookForm.elements.title.value = book.title; bookForm.elements.author.value = book.author; bookForm.elements.isbn.value = book.isbn; document.querySelector('#dialogTitle').textContent = 'Edit book'; bookDialog.showModal(); };
window.openBorrow = id => { borrowForm.reset(); borrowForm.elements.id.value = id; borrowDialog.showModal(); };
borrowForm.addEventListener('submit', async event => { event.preventDefault(); const data = Object.fromEntries(new FormData(borrowForm)); try { await api(`/api/books/${data.id}/borrow`, { method: 'POST', body: JSON.stringify({ borrower: data.borrower }) }); borrowDialog.close(); toast('Book borrowed'); await load(); } catch (error) { toast(error.message); } });
window.returnBook = async id => { try { await api(`/api/books/${id}/return`, { method: 'POST', body: '{}' }); toast('Book returned'); await load(); } catch (error) { toast(error.message); } };
window.deleteBook = async id => { if (!confirm('Delete this book?')) return; try { await api(`/api/books/${id}`, { method: 'DELETE' }); toast('Book deleted'); await load(); } catch (error) { toast(error.message); } };

load().catch(error => toast(error.message));
