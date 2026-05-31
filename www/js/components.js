/* ── Toast ── */
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    container.setAttribute('data-testid', 'toast-container');
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('data-testid', `toast-${type}`);
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

/* ── Lock Guard ── */
async function withLock(fn) {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LockedError) {
      showToast('系统正在编辑中，请稍后重试', 'warning');
      return null;
    }
    throw e;
  }
}

/* ── Lock State ── */
function lockDisabled() {
  if (typeof AppState !== 'undefined' && AppState.lock) {
    return AppState.lock.locked && !AppState.lock.isOwn;
  }
  return false;
}

function getLockHolder() {
  if (typeof AppState !== 'undefined' && AppState.lock) {
    return AppState.lock.holderIp;
  }
  return null;
}

/* ── Inline Delete Confirm ── */
function createInlineConfirm(rowEl, { onConfirm, onCancel }) {
  const actionsCell = rowEl.querySelector('td.actions');
  if (!actionsCell) return;

  rowEl.classList.add('row--deleting');

  const originalHtml = actionsCell.innerHTML;
  actionsCell.innerHTML = `
    <div class="inline-confirm-bar">
      <button class="btn btn-danger-solid btn-sm row-confirm-delete-btn" data-testid="row-confirm-delete-btn">确认删除</button>
      <button class="btn btn-secondary btn-sm row-cancel-btn" data-testid="row-cancel-btn">取消</button>
    </div>`;

  const confirmBtn = actionsCell.querySelector('.row-confirm-delete-btn');
  const cancelBtn = actionsCell.querySelector('.row-cancel-btn');

  const cleanup = () => {
    rowEl.classList.remove('row--deleting');
    actionsCell.innerHTML = originalHtml;
    confirmBtn.removeEventListener('click', handleConfirm);
    cancelBtn.removeEventListener('click', handleCancel);
  };

  const handleConfirm = () => {
    onConfirm?.();
    cleanup();
  };

  const handleCancel = () => {
    onCancel?.();
    cleanup();
  };

  confirmBtn.addEventListener('click', handleConfirm);
  cancelBtn.addEventListener('click', handleCancel);

  return { cleanup };
}

/* ── NavBar ── */
function buildNavBar(currentPage) {
  const nav = document.createElement('nav');
  nav.className = 'top-nav';
  nav.setAttribute('data-testid', 'top-nav');
  const pages = [
    { name: '产品视图', href: '/', key: 'dashboard' },
    { name: '团队视图', href: '/team-dashboard.html', key: 'team-dash' },
    { name: '人员', href: '/people.html', key: 'people' },
    { name: '团队', href: '/teams.html', key: 'teams' },
    { name: '产品', href: '/products.html', key: 'products' },
    { name: '目标', href: '/goals.html', key: 'goals' },
    { name: '标签', href: '/tags.html', key: 'tags' },
    { name: '管理', href: '/admin.html', key: 'admin' },
  ];
  nav.innerHTML = `
    <a href="/" class="nav-brand">部门目标管理</a>
    <div class="nav-links">${pages.map(p =>
      `<a href="${p.href}" class="nav-link ${p.key === currentPage ? 'active' : ''}" data-testid="nav-link-${p.key}">${p.name}</a>`
    ).join('')}</div>
    <div class="nav-right">
      <div class="lock-indicator">
        <span class="lock-dot" id="lockDot" data-testid="lock-indicator-dot"></span>
        <span id="lockText" data-testid="lock-indicator-text">检查中...</span>
      </div>
    </div>`;
  document.body.prepend(nav);
  updateLockStatus();
}

async function updateLockStatus() {
  try {
    const status = await api.get('/admin/status');
    const dot = document.getElementById('lockDot');
    const text = document.getElementById('lockText');
    if (!dot || !text) return;

    const lock = status.lock;

    // Update AppState if available
    if (typeof AppState !== 'undefined') {
      AppState.setLock(lock);
    }

    if (lock.locked && lock.isOwn) {
      dot.className = 'lock-dot own';
      text.textContent = '编辑中 (你)';
    } else if (lock.locked) {
      dot.className = 'lock-dot locked';
      text.textContent = `编辑中 (${lock.holderIp})`;
    } else {
      dot.className = 'lock-dot';
      text.textContent = '可编辑';
    }
  } catch {
    // admin API might not be available
  }
}

/* ── MultiSelect ── */
class MultiSelect {
  constructor(container, options = [], selected = [], onChange) {
    this.container = container;
    this.options = options;
    this.selected = new Set(selected);
    this.onChange = onChange;
    this.render();
  }

  render() {
    this.container.innerHTML = '';
    this.container.className = 'multiselect';
    this.container.style.position = 'relative';

    for (const id of this.selected) {
      const opt = this.options.find(o => o.id === id);
      if (opt) this.addChip(opt);
    }

    const input = document.createElement('input');
    input.className = 'ms-input';
    input.placeholder = '搜索...';
    this.container.appendChild(input);

    let dropdown = null;
    let outsideHandler = null;

    const removeDropdown = () => {
      if (dropdown) { dropdown.remove(); dropdown = null; }
      if (outsideHandler) {
        document.removeEventListener('mousedown', outsideHandler, true);
        outsideHandler = null;
      }
    };

    const showDropdown = () => {
      removeDropdown();
      const available = this.options.filter(o => !this.selected.has(o.id));
      if (!available.length) return;

      dropdown = document.createElement('div');
      dropdown.className = 'ms-dropdown';
      const rect = this.container.getBoundingClientRect();
      dropdown.style.position = 'fixed';
      dropdown.style.top = rect.bottom + 4 + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.width = rect.width + 'px';

      const filter = (q) => {
        dropdown.innerHTML = available
          .filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
          .map(o => `<div class="ms-option" data-id="${o.id}">${escHtml(o.label)}</div>`).join('');
        if (!dropdown.querySelector('.ms-option')) {
          dropdown.innerHTML = '<div class="ms-option" style="color:var(--muted)">无匹配项</div>';
        }
      };

      filter(input.value);
      dropdown.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent input blur before render() destroys it
        const optDiv = e.target.closest('.ms-option');
        if (optDiv?.dataset.id) {
          const opt = this.options.find(o => o.id === optDiv.dataset.id);
          if (opt) {
            this.selected.add(opt.id);
            this.render();
            this.onChange?.(Array.from(this.selected));
          }
        }
      });

      this.container.appendChild(dropdown);
    };

    outsideHandler = (e) => {
      if (!this.container.contains(e.target)) {
        removeDropdown();
      }
    };
    document.addEventListener('mousedown', outsideHandler, true);

    input.addEventListener('focus', showDropdown);
    input.addEventListener('input', () => {
      if (dropdown) {
        const q = input.value;
        const available = this.options.filter(o => !this.selected.has(o.id));
        dropdown.innerHTML = available
          .filter(o => o.label.toLowerCase().includes(q.toLowerCase()))
          .map(o => `<div class="ms-option" data-id="${o.id}">${escHtml(o.label)}</div>`).join('');
        if (!dropdown.querySelector('.ms-option')) {
          dropdown.innerHTML = '<div class="ms-option" style="color:var(--muted)">无匹配项</div>';
        }
      }
    });
  }

  addChip(opt) {
    const chip = document.createElement('span');
    chip.className = 'ms-chip';
    chip.innerHTML = `${escHtml(opt.label)}<span class="ms-remove" data-id="${opt.id}">&times;</span>`;
    chip.querySelector('.ms-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      this.selected.delete(opt.id);
      this.render();
      this.onChange?.(Array.from(this.selected));
    });
    this.container.insertBefore(chip, this.container.querySelector('input'));
  }

  getSelected() { return Array.from(this.selected); }
  setOptions(opts) { this.options = opts; this.render(); }
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Lock UI Update ── */
function updateMutatingButtons() {
  const disabled = lockDisabled();
  const holder = getLockHolder();

  document.querySelectorAll('.mutating-btn').forEach(btn => {
    if (disabled) {
      btn.classList.add('lock-disabled');
      btn.setAttribute('title', `系统正由 ${holder || '未知'} 编辑中`);
    } else {
      btn.classList.remove('lock-disabled');
      btn.removeAttribute('title');
    }
  });

  // Also update standalone add buttons in toolbars
  document.querySelectorAll('[data-lock-sensitive]').forEach(el => {
    if (disabled) {
      el.classList.add('lock-disabled');
      el.setAttribute('title', `系统正由 ${holder || '未知'} 编辑中`);
    } else {
      el.classList.remove('lock-disabled');
      el.removeAttribute('title');
    }
  });
}

// Subscribe to lock changes for UI updates
if (typeof AppState !== 'undefined') {
  AppState.subscribe('lock', () => updateMutatingButtons());
}

window.showToast = showToast;
window.withLock = withLock;
window.lockDisabled = lockDisabled;
window.getLockHolder = getLockHolder;
window.createInlineConfirm = createInlineConfirm;
window.buildNavBar = buildNavBar;
window.updateLockStatus = updateLockStatus;
window.MultiSelect = MultiSelect;
window.escHtml = escHtml;
window.updateMutatingButtons = updateMutatingButtons;
