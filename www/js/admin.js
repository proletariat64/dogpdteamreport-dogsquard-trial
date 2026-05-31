buildNavBar('admin');
track('page_view', { page: 'admin' });

async function load() {
  try {
    const [status, backups] = await Promise.all([
      api.get('/admin/status'), api.get('/admin/backups'),
    ]);
    renderStatus(status);
    renderBackups(backups);
    updateLockIndicator(status);
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

function renderStatus(s) {
  document.getElementById('dbSize').textContent = s.dbSizeFormatted;
  document.getElementById('uptime').textContent = formatUptime(s.uptime);

  const counts = document.getElementById('recordCounts');
  const labels = { tags: '标签', teams: '团队', people: '人员', l1_products: 'L1 产品', l2_products: 'L2 产品', l0_goals: 'L0 目标', l1_goals: 'L1 目标', l2_goals: 'L2 目标' };
  counts.innerHTML = Object.entries(s.recordCounts).map(([k, v]) =>
    `<div style="display:flex;justify-content:space-between;padding:var(--space-xxs) 0"><span style="color:var(--muted)">${labels[k]||k}</span><strong>${v}</strong></div>`
  ).join('');
}

function renderBackups(backups) {
  const tbody = document.getElementById('backupTable');
  if (!backups.length) { tbody.innerHTML = '<tr><td colspan="4" class="empty-state">暂无备份</td></tr>'; return; }
  tbody.innerHTML = backups.map(b => `
    <tr>
      <td><span class="code">${escHtml(b.filename)}</span></td>
      <td>${(b.size/1024).toFixed(1)} KB</td>
      <td>${new Date(b.createdAt).toLocaleString('zh-CN')}</td>
      <td class="actions"><a href="/api/admin/backup/${b.filename}" class="btn btn-text btn-sm" data-testid="admin-backup-download-link">下载</a></td>
    </tr>`).join('');
}

function updateLockIndicator(status) {
  const lock = status.lock;
  const stateEl = document.getElementById('lockState');
  stateEl.textContent = lock.locked ? '已锁定' : '空闲';
  stateEl.style.color = lock.locked ? 'var(--error)' : 'var(--success)';

  const details = document.getElementById('lockDetails');
  if (lock.locked) {
    details.style.display = 'block';
    document.getElementById('lockHolder').textContent = lock.holderIp;
    document.getElementById('lockAcquired').textContent = lock.acquiredAt ? new Date(lock.acquiredAt).toLocaleString('zh-CN') : '--';
    document.getElementById('lockLastActivity').textContent = lock.lastActivityAt ? new Date(lock.lastActivityAt).toLocaleString('zh-CN') : '--';
  } else {
    details.style.display = 'none';
  }

  const btn = document.getElementById('btnForceRelease');
  if (btn) {
    btn.disabled = !lock.locked;
    btn.style.opacity = lock.locked ? '1' : '0.5';
  }
}

function formatUptime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

async function doBackup() {
  try {
    const result = await api.post('/admin/backup');
    track('backup_create', { filename: result.filename });
    showToast('备份已创建: ' + result.filename);
    load();
  } catch (e) { showToast('备份失败: ' + e.message, 'error'); }
}

function doForceRelease() {
  const container = document.getElementById('forceReleaseContainer');
  const btn = document.getElementById('btnForceRelease');

  // Hide the button, show inline confirm
  btn.style.display = 'none';
  container.innerHTML += `
    <div class="inline-confirm-bar" id="releaseConfirm" style="margin-top:var(--space-xs)">
      <span style="color:var(--error);font-size:13px">确认释放锁？当前编辑者未保存的更改可能丢失。</span>
      <button class="btn btn-danger btn-sm" data-testid="admin-confirm-release-btn" id="btnConfirmRelease">确认释放</button>
      <button class="btn btn-secondary btn-sm" data-testid="admin-cancel-release-btn" id="btnCancelRelease">取消</button>
    </div>`;

  document.getElementById('btnConfirmRelease').addEventListener('click', async () => {
    try {
      await api.delete('/admin/lock');
      showToast('锁已释放');
      track('lock_released', { action: 'force_release' });
      load();
    } catch (e) { showToast('释放失败: ' + e.message, 'error'); }
    // Cleanup confirm UI
    const confirm = document.getElementById('releaseConfirm');
    if (confirm) confirm.remove();
    btn.style.display = '';
  });

  document.getElementById('btnCancelRelease').addEventListener('click', () => {
    const confirm = document.getElementById('releaseConfirm');
    if (confirm) confirm.remove();
    btn.style.display = '';
  });
}

// Set data-testid attributes on critical elements
document.getElementById('btnForceRelease').setAttribute('data-testid', 'admin-force-release-btn');
document.getElementById('btnBackup').setAttribute('data-testid', 'admin-backup-btn');
document.getElementById('backupTable').closest('table').setAttribute('data-testid', 'admin-backups-table');

// HACK: wrap force release button in a container for inline confirm
const releaseBtn = document.getElementById('btnForceRelease');
const wrapper = document.createElement('div');
wrapper.id = 'forceReleaseContainer';
releaseBtn.parentNode.insertBefore(wrapper, releaseBtn);
wrapper.appendChild(releaseBtn);

// Add data-testid to lock card
document.getElementById('lockState').closest('.card').setAttribute('data-testid', 'admin-lock-status-card');
const lockHolder = document.getElementById('lockHolder');
if (lockHolder) lockHolder.setAttribute('data-testid', 'admin-lock-holder-ip');

load();
