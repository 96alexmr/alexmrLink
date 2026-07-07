export const ADMIN_PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>link.alexmr.me</title>
<style>
  :root { color-scheme: light dark; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    max-width: 760px;
    margin: 3rem auto;
    padding: 0 1.5rem;
    color: #1a1a1a;
    background: #fff;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #e8e8e8; background: #16171a; }
    input { background: #232428; color: #e8e8e8; border-color: #3a3b40 !important; }
    table { border-color: #3a3b40 !important; }
    th, td { border-color: #3a3b40 !important; }
    a { color: #7db8ff; }
  }
  h1 { font-size: 1.4rem; margin-bottom: 0.25rem; }
  .sub { opacity: 0.65; font-size: 0.9rem; margin-bottom: 2rem; }
  form { display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
  input {
    padding: 0.5rem 0.7rem;
    border: 1px solid #ccc;
    border-radius: 6px;
    font-size: 0.95rem;
  }
  input[name="url"] { flex: 2; min-width: 220px; }
  input[name="slug"] { flex: 1; min-width: 140px; }
  button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    font-size: 0.95rem;
    cursor: pointer;
  }
  button:hover { background: #1d4ed8; }
  button.danger { background: #dc2626; padding: 0.3rem 0.6rem; font-size: 0.85rem; }
  button.danger:hover { background: #b91c1c; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 0.5rem 0.4rem; border-bottom: 1px solid #e5e5e5; font-size: 0.9rem; }
  th { opacity: 0.6; font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
  td.url { max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .error { color: #dc2626; font-size: 0.9rem; margin-bottom: 1rem; display: none; }
  .empty { opacity: 0.6; font-size: 0.9rem; padding: 1rem 0; }
  h2 { font-size: 1.05rem; margin: 2.5rem 0 0.75rem; }
  .token-reveal {
    display: none;
    background: #ecfdf5;
    border: 1px solid #a7f3d0;
    border-radius: 6px;
    padding: 0.75rem 1rem;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }
  .token-reveal code {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.85rem;
    word-break: break-all;
    user-select: all;
  }
  @media (prefers-color-scheme: dark) {
    .token-reveal { background: #052e1f; border-color: #0d5f3d; }
  }
</style>
</head>
<body>
  <h1>link.alexmr.me</h1>
  <div class="sub">Link shortener admin</div>

  <div class="error" id="error"></div>

  <form id="create-form">
    <input type="url" name="url" placeholder="https://destination.example.com/page" required />
    <input type="text" name="slug" placeholder="custom-slug (optional)" pattern="[A-Za-z0-9_-]{1,64}" />
    <button type="submit">Create</button>
  </form>

  <table id="table">
    <thead>
      <tr><th>Slug</th><th>Destination</th><th>Created</th><th></th></tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <div class="empty" id="empty" style="display:none">No links yet.</div>

  <h2>API tokens</h2>
  <div class="sub">Scoped to creating links only (used by things like a Stream Deck plugin). They cannot list, delete links, or manage other tokens.</div>

  <div class="token-reveal" id="token-reveal">
    Copy this now &mdash; it won't be shown again:
    <code id="token-reveal-value"></code>
  </div>

  <form id="token-form">
    <input type="text" name="name" placeholder="token name (e.g. Stream Deck)" required />
    <button type="submit">Create token</button>
  </form>

  <table id="token-table">
    <thead>
      <tr><th>Name</th><th>Created</th><th></th></tr>
    </thead>
    <tbody id="token-rows"></tbody>
  </table>
  <div class="empty" id="token-empty" style="display:none">No tokens yet.</div>

<script>
const errorEl = document.getElementById('error');
const rowsEl = document.getElementById('rows');
const emptyEl = document.getElementById('empty');

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}
function clearError() {
  errorEl.style.display = 'none';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadLinks() {
  clearError();
  const res = await fetch('/api/links');
  if (!res.ok) { showError('Failed to load links (' + res.status + ')'); return; }
  const links = await res.json();
  rowsEl.innerHTML = '';
  emptyEl.style.display = links.length === 0 ? 'block' : 'none';
  for (const link of links) {
    const tr = document.createElement('tr');
    const created = new Date(link.createdAt).toLocaleDateString();
    tr.innerHTML = \`
      <td><a href="/\${escapeHtml(link.slug)}" target="_blank">\${escapeHtml(link.slug)}</a></td>
      <td class="url" title="\${escapeHtml(link.url)}">\${escapeHtml(link.url)}</td>
      <td>\${created}</td>
      <td><button class="danger" data-slug="\${escapeHtml(link.slug)}">Delete</button></td>
    \`;
    rowsEl.appendChild(tr);
  }
}

document.getElementById('create-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const form = e.target;
  const url = form.url.value.trim();
  const slug = form.slug.value.trim();
  const res = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, slug: slug || undefined }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    showError(body.error || 'Failed to create link (' + res.status + ')');
    return;
  }
  form.reset();
  await loadLinks();
});

rowsEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.danger');
  if (!btn) return;
  const slug = btn.dataset.slug;
  if (!confirm('Delete /' + slug + '?')) return;
  const res = await fetch('/api/links/' + encodeURIComponent(slug), { method: 'DELETE' });
  if (!res.ok) { showError('Failed to delete (' + res.status + ')'); return; }
  await loadLinks();
});

const tokenRowsEl = document.getElementById('token-rows');
const tokenEmptyEl = document.getElementById('token-empty');
const tokenRevealEl = document.getElementById('token-reveal');
const tokenRevealValueEl = document.getElementById('token-reveal-value');

async function loadTokens() {
  clearError();
  const res = await fetch('/api/tokens');
  if (!res.ok) { showError('Failed to load tokens (' + res.status + ')'); return; }
  const tokens = await res.json();
  tokenRowsEl.innerHTML = '';
  tokenEmptyEl.style.display = tokens.length === 0 ? 'block' : 'none';
  for (const t of tokens) {
    const tr = document.createElement('tr');
    const created = new Date(t.createdAt).toLocaleDateString();
    tr.innerHTML = \`
      <td>\${escapeHtml(t.name)}</td>
      <td>\${created}</td>
      <td><button class="danger" data-id="\${escapeHtml(t.id)}">Revoke</button></td>
    \`;
    tokenRowsEl.appendChild(tr);
  }
}

document.getElementById('token-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const form = e.target;
  const name = form.name.value.trim();
  const res = await fetch('/api/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    showError(body.error || 'Failed to create token (' + res.status + ')');
    return;
  }
  const created = await res.json();
  tokenRevealValueEl.textContent = created.token;
  tokenRevealEl.style.display = 'block';
  form.reset();
  await loadTokens();
});

tokenRowsEl.addEventListener('click', async (e) => {
  const btn = e.target.closest('button.danger');
  if (!btn) return;
  const id = btn.dataset.id;
  if (!confirm('Revoke this token? Anything using it will stop working.')) return;
  const res = await fetch('/api/tokens/' + encodeURIComponent(id), { method: 'DELETE' });
  if (!res.ok) { showError('Failed to revoke (' + res.status + ')'); return; }
  await loadTokens();
});

loadLinks();
loadTokens();
</script>
</body>
</html>
`;
