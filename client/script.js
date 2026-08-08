// =====================================================================
// MeraBox — client/script.js
//
// This is a tiny "single page app" written in plain JavaScript (no
// framework). It does three jobs:
//   1. Look at the current URL and decide which screen to show
//      (create screen vs. view-paste screen vs. 404).
//   2. Talk to the backend REST API (POST/GET/DELETE /api/pastes/:id).
//   3. Handle UI details: dark mode, toasts, copy-to-clipboard, etc.
// =====================================================================

const API_BASE = '/api/pastes';

// ---- Cache DOM elements we'll use repeatedly ----
const views = {
  create: document.getElementById('create-view'),
  paste: document.getElementById('paste-view'),
  loading: document.getElementById('loading-view'),
  notfound: document.getElementById('notfound-view')
};

const pasteForm = document.getElementById('paste-form');
const titleInput = document.getElementById('title-input');
const languageSelect = document.getElementById('language-select');
const contentInput = document.getElementById('content-input');
const expirySelect = document.getElementById('expiry-select');
const charCount = document.getElementById('char-count');
const createBtn = document.getElementById('create-btn');
const pathLabel = document.getElementById('path-label');

const viewPathLabel = document.getElementById('view-path-label');
const viewTitle = document.getElementById('view-title');
const viewLanguage = document.getElementById('view-language');
const viewCreated = document.getElementById('view-created');
const viewExpires = document.getElementById('view-expires');
const viewContent = document.getElementById('view-content');
const copyBtn = document.getElementById('copy-btn');
const deleteBtn = document.getElementById('delete-btn');
const newBtn = document.getElementById('new-btn');
const notfoundMessage = document.getElementById('notfound-message');

const themeToggle = document.getElementById('theme-toggle');
const iconMoon = document.getElementById('icon-moon');
const iconSun = document.getElementById('icon-sun');

let currentPasteId = null; // used by the Delete button on the view screen

// =====================================================================
// Routing — decide what to show based on the URL
// =====================================================================

function showView(name) {
  Object.values(views).forEach((el) => el.setAttribute('hidden', ''));
  views[name].removeAttribute('hidden');
}

async function router() {
  const path = window.location.pathname;
  const match = path.match(/^\/p\/([A-Za-z0-9_-]+)\/?$/);

  if (match) {
    const id = match[1];
    await loadPaste(id);
  } else {
    showView('create');
    resetCreateForm();
  }
}

// Intercept clicks on internal links (like "Create a new paste" on the
// 404 screen) so we do a client-side navigation instead of a full reload.
document.addEventListener('click', (e) => {
  const link = e.target.closest('[data-link]');
  if (!link) return;
  e.preventDefault();
  window.history.pushState({}, '', link.getAttribute('href'));
  router();
});

window.addEventListener('popstate', router);

// =====================================================================
// Create a paste
// =====================================================================

function resetCreateForm() {
  pasteForm.reset();
  updateCharCount();
  updatePathLabel();
}

function updateCharCount() {
  const n = contentInput.value.length;
  charCount.textContent = `${n.toLocaleString()} character${n === 1 ? '' : 's'}`;
}

function updatePathLabel() {
  const title = titleInput.value.trim();
  const slug = title ? title.toLowerCase().replace(/\s+/g, '-').slice(0, 30) : 'untitled';
  pathLabel.textContent = `~/merabox/${slug}`;
}

contentInput.addEventListener('input', updateCharCount);
titleInput.addEventListener('input', updatePathLabel);

pasteForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const content = contentInput.value;
  if (!content.trim()) {
    showToast('Please write something before creating a paste.', true);
    return;
  }

  setCreateLoading(true);

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleInput.value,
        content,
        language: languageSelect.value,
        expiry: expirySelect.value
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to create paste.');
    }

    showToast('Paste created!');
    window.history.pushState({}, '', data.url);
    await loadPaste(data.id);
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong.', true);
  } finally {
    setCreateLoading(false);
  }
});

function setCreateLoading(isLoading) {
  createBtn.disabled = isLoading;
  createBtn.querySelector('.btn-label').textContent = isLoading ? 'Creating…' : 'Create Paste';
  createBtn.querySelector('.btn-spinner').hidden = !isLoading;
}

// =====================================================================
// View a paste
// =====================================================================

async function loadPaste(id) {
  showView('loading');

  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const data = await res.json();

    if (!res.ok) {
      notfoundMessage.textContent =
        res.status === 404 ? (data.error || "This paste doesn't exist.") : 'Something went wrong loading this paste.';
      showView('notfound');
      return;
    }

    renderPaste(data);
    showView('paste');
  } catch (err) {
    console.error(err);
    notfoundMessage.textContent = 'Could not reach the server. Please check your connection and try again.';
    showView('notfound');
  }
}

function renderPaste(paste) {
  currentPasteId = paste.id;

  viewTitle.textContent = paste.title || 'Untitled';
  viewLanguage.textContent = paste.language || 'plaintext';
  viewPathLabel.textContent = `~/merabox/p/${paste.id}`;

  viewCreated.textContent = `Created ${formatDate(paste.createdAt)}`;
  viewExpires.textContent = paste.expiresAt ? `Expires ${formatDate(paste.expiresAt)}` : 'Never expires';

  viewContent.textContent = paste.content;
  viewContent.className = paste.language ? `language-${paste.language}` : '';

  // Apply syntax highlighting (highlight.js is loaded via CDN in index.html)
  if (window.hljs) {
    viewContent.removeAttribute('data-highlighted');
    window.hljs.highlightElement(viewContent);
  }
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(viewContent.textContent);
    showToast('Copied to clipboard!');
  } catch (err) {
    showToast('Could not copy — please copy manually.', true);
  }
});

newBtn.addEventListener('click', () => {
  window.history.pushState({}, '', '/');
  router();
});

deleteBtn.addEventListener('click', async () => {
  if (!currentPasteId) return;
  const confirmed = window.confirm('Delete this paste? This cannot be undone.');
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/${currentPasteId}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to delete paste.');
    }

    showToast('Paste deleted.');
    window.history.pushState({}, '', '/');
    router();
  } catch (err) {
    console.error(err);
    showToast(err.message || 'Something went wrong.', true);
  }
});

// =====================================================================
// Toast notifications
// =====================================================================

function showToast(message, isError = false) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast' + (isError ? ' toast-error' : '');
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.2s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, 2800);
}

// =====================================================================
// Dark / light theme toggle
// =====================================================================

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('merabox-theme', theme);
  iconMoon.style.display = theme === 'dark' ? 'inline' : 'none';
  iconSun.style.display = theme === 'light' ? 'inline' : 'none';
}

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

(function initTheme() {
  const saved = localStorage.getItem('merabox-theme');
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
  applyTheme(saved || (prefersLight ? 'light' : 'dark'));
})();

// =====================================================================
// Boot
// =====================================================================

router();
