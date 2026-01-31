// Dashboard JavaScript
let currentUser = null;
let links = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  await loadLinks();
  await loadAnalytics();
  setupEventListeners();
});

// Check authentication
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) {
      window.location.href = '/login';
      return;
    }
    const data = await res.json();
    currentUser = data.user;
    document.getElementById('viewProfile').href = '/' + currentUser.username;

    // Populate settings
    document.getElementById('displayName').value = currentUser.display_name || '';
    document.getElementById('bio').value = currentUser.bio || '';
    document.getElementById('avatarUrl').value = currentUser.avatar_url || '';
    document.getElementById('theme').value = currentUser.theme || 'default';

    // Update plan UI
    updatePlanUI();

    // Check for upgrade success
    if (window.location.search.includes('upgraded=true')) {
      showToast('Welcome to Pro! Enjoy your new features.', 'success');
      window.history.replaceState({}, '', '/dashboard');
    }
  } catch (err) {
    window.location.href = '/login';
  }
}

// Update plan UI based on user's subscription
function updatePlanUI() {
  const planText = document.getElementById('planText');
  const upgradeLink = document.getElementById('upgradeLink');
  const manageBillingLink = document.getElementById('manageBillingLink');
  const themeHint = document.getElementById('themeHint');
  const proThemeOptions = document.querySelectorAll('#theme option[data-pro]');

  if (currentUser.isPro) {
    // Pro user
    planText.textContent = 'Pro Plan';
    planText.style.color = 'var(--success)';
    upgradeLink.style.display = 'none';
    manageBillingLink.style.display = 'block';
    themeHint.style.display = 'none';

    // Enable pro themes
    proThemeOptions.forEach(opt => {
      opt.disabled = false;
    });

    // Setup manage billing link
    manageBillingLink.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/billing/portal', { method: 'POST' });
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        showToast('Failed to open billing portal', 'error');
      }
    });
  } else {
    // Free user
    planText.textContent = 'Free Plan';
    upgradeLink.style.display = 'block';
    manageBillingLink.style.display = 'none';
    themeHint.style.display = 'block';

    // Disable pro themes
    proThemeOptions.forEach(opt => {
      opt.disabled = true;
      opt.textContent = opt.textContent.replace(' (Pro)', '') + ' (Pro)';
    });
  }
}

// Load links
async function loadLinks() {
  try {
    const res = await fetch('/api/links');
    const data = await res.json();
    links = data.links;
    renderLinks();
  } catch (err) {
    showToast('Failed to load links', 'error');
  }
}

// Render links
function renderLinks() {
  const container = document.getElementById('linksList');

  if (links.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
        <p style="font-size: 1.25rem; margin-bottom: 1rem;">No links yet!</p>
        <p>Click "Add Link" to create your first link.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = links.map(link => `
    <div class="link-card ${link.is_active ? '' : 'inactive'}" data-id="${link.id}" draggable="true">
      <span class="drag-handle">⋮⋮</span>
      <div class="link-info">
        <div class="link-title">${escapeHtml(link.title)}</div>
        <div class="link-url">${escapeHtml(link.url)}</div>
      </div>
      <div class="link-actions">
        <button class="toggle-btn" onclick="toggleLink(${link.id})" title="${link.is_active ? 'Disable' : 'Enable'}">
          ${link.is_active ? '👁' : '👁‍🗨'}
        </button>
        <button class="toggle-btn" onclick="editLink(${link.id})" title="Edit">✏️</button>
        <button class="toggle-btn" onclick="deleteLink(${link.id})" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');

  setupDragAndDrop();
}

// Load analytics
async function loadAnalytics() {
  try {
    const res = await fetch('/api/analytics/overview');
    const data = await res.json();

    document.getElementById('totalViews').textContent = data.totalViews;
    document.getElementById('totalClicks').textContent = data.totalClicks;

    const rate = data.totalViews > 0
      ? ((data.totalClicks / data.totalViews) * 100).toFixed(1)
      : 0;
    document.getElementById('clickRate').textContent = rate + '%';

    // 7-day stats
    const views7d = data.viewsLast7Days.reduce((sum, d) => sum + d.count, 0);
    const clicks7d = data.clicksLast7Days.reduce((sum, d) => sum + d.count, 0);
    document.getElementById('views7d').textContent = views7d;
    document.getElementById('clicks7d').textContent = clicks7d;

    // Top links
    const topLinksContainer = document.getElementById('topLinks');
    if (data.topLinks.length === 0) {
      topLinksContainer.innerHTML = '<p style="color: var(--text-muted);">No click data yet.</p>';
    } else {
      topLinksContainer.innerHTML = data.topLinks.map(link => `
        <div class="link-card">
          <div class="link-info">
            <div class="link-title">${escapeHtml(link.title)}</div>
            <div class="link-url">${escapeHtml(link.url)}</div>
          </div>
          <div style="font-size: 1.5rem; font-weight: bold;">${link.clicks} clicks</div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Failed to load analytics:', err);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab navigation
  document.querySelectorAll('.sidebar-nav a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const tab = e.target.dataset.tab;
      switchTab(tab);
    });
  });

  // Add link button
  document.getElementById('addLinkBtn').addEventListener('click', () => {
    openModal();
  });

  // Cancel button
  document.getElementById('cancelBtn').addEventListener('click', () => {
    closeModal();
  });

  // Link form submit
  document.getElementById('linkForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveLink();
  });

  // Settings form submit
  document.getElementById('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSettings();
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/';
  });

  // Close modal on overlay click
  document.getElementById('linkModal').addEventListener('click', (e) => {
    if (e.target.id === 'linkModal') {
      closeModal();
    }
  });
}

// Tab switching
function switchTab(tab) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.getElementById(`${tab}-tab`).style.display = 'block';
}

// Modal functions
function openModal(link = null) {
  const modal = document.getElementById('linkModal');
  const title = document.getElementById('modalTitle');
  const form = document.getElementById('linkForm');

  if (link) {
    title.textContent = 'Edit Link';
    document.getElementById('linkId').value = link.id;
    document.getElementById('linkTitle').value = link.title;
    document.getElementById('linkUrl').value = link.url;
  } else {
    title.textContent = 'Add New Link';
    form.reset();
    document.getElementById('linkId').value = '';
  }

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('linkModal').classList.remove('active');
}

// Save link
async function saveLink() {
  const id = document.getElementById('linkId').value;
  const title = document.getElementById('linkTitle').value;
  const url = document.getElementById('linkUrl').value;

  try {
    const endpoint = id ? `/api/links/${id}` : '/api/links';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, url })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error);
    }

    showToast(id ? 'Link updated!' : 'Link added!', 'success');
    closeModal();
    await loadLinks();
  } catch (err) {
    showToast(err.message || 'Failed to save link', 'error');
  }
}

// Edit link
function editLink(id) {
  const link = links.find(l => l.id === id);
  if (link) {
    openModal(link);
  }
}

// Toggle link active state
async function toggleLink(id) {
  const link = links.find(l => l.id === id);
  if (!link) return;

  try {
    await fetch(`/api/links/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !link.is_active })
    });

    await loadLinks();
    showToast(link.is_active ? 'Link hidden' : 'Link visible', 'success');
  } catch (err) {
    showToast('Failed to update link', 'error');
  }
}

// Delete link
async function deleteLink(id) {
  if (!confirm('Are you sure you want to delete this link?')) return;

  try {
    await fetch(`/api/links/${id}`, { method: 'DELETE' });
    showToast('Link deleted!', 'success');
    await loadLinks();
  } catch (err) {
    showToast('Failed to delete link', 'error');
  }
}

// Save settings
async function saveSettings() {
  const display_name = document.getElementById('displayName').value;
  const bio = document.getElementById('bio').value;
  const avatar_url = document.getElementById('avatarUrl').value;
  const theme = document.getElementById('theme').value;

  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, bio, avatar_url, theme })
    });

    if (!res.ok) throw new Error();

    showToast('Settings saved!', 'success');
  } catch (err) {
    showToast('Failed to save settings', 'error');
  }
}

// Drag and drop
function setupDragAndDrop() {
  const container = document.getElementById('linksList');
  const cards = container.querySelectorAll('.link-card');

  cards.forEach(card => {
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragend', handleDragEnd);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
  });
}

let draggedItem = null;

function handleDragStart(e) {
  draggedItem = this;
  this.classList.add('dragging');
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
}

function handleDragOver(e) {
  e.preventDefault();
}

async function handleDrop(e) {
  e.preventDefault();
  if (this === draggedItem) return;

  const container = document.getElementById('linksList');
  const cards = [...container.querySelectorAll('.link-card')];
  const fromIndex = cards.indexOf(draggedItem);
  const toIndex = cards.indexOf(this);

  // Reorder in DOM
  if (fromIndex < toIndex) {
    this.parentNode.insertBefore(draggedItem, this.nextSibling);
  } else {
    this.parentNode.insertBefore(draggedItem, this);
  }

  // Get new order
  const newOrder = [...container.querySelectorAll('.link-card')].map(
    card => parseInt(card.dataset.id)
  );

  // Save new order
  try {
    await fetch('/api/links/reorder/all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: newOrder })
    });
  } catch (err) {
    showToast('Failed to reorder links', 'error');
    await loadLinks();
  }
}

// Toast notifications
function showToast(message, type = 'success') {
  const container = document.getElementById('toasts');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Utility
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
