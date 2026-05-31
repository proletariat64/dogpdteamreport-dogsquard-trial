buildNavBar('tags');
track('page_view', { page: 'tags' });

let tags = [];
let inlineCreate = null;

async function load() {
  try {
    tags = await api.get('/tags');
    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

function render() {
  const tbody = document.getElementById('tagsTable');
  const empty = document.getElementById('emptyState');
  document.getElementById('tagCount').textContent = `共 ${tags.length} 个`;
  if (!tags.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  tbody.innerHTML = tags.map(t => `
    <tr data-testid="tags-row-${t.id}">
      <td><span class="badge badge-default" style="font-size:14px">${escHtml(t.value)}</span></td>
      <td style="color:var(--muted)">${t.createdAt ? new Date(t.createdAt).toLocaleString('zh-CN') : '-'}</td>
      <td class="actions">
        <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editTag('${t.id}')">编辑</button>
        <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deleteTag('${t.id}')">删除</button>
      </td>
    </tr>`).join('');

  if (typeof updateMutatingButtons === 'function') updateMutatingButtons();
}

function startCreate() {
  if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }

  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_create_start', { page: 'tags', entity_type: 'tag' });

  if (typeof InlineCreateRow === 'undefined') { showToast('InlineCreateRow 未加载', 'error'); return; }
  inlineCreate = new InlineCreateRow(document.getElementById('tagsTable'), {
    fields: [
      { name: 'value', label: '标签名称 *', type: 'text', placeholder: '最多50字', required: true }
    ],
    onSave: async (data) => {
      const value = data.value.trim();
      if (!value) { inlineCreate.setError('标签名称不能为空'); return; }

      track('entity_create_submit', { page: 'tags', entity_type: 'tag' });
      if (inlineCreate) inlineCreate.setSaving();

      const result = await withLock(async () => {
        return await api.post('/tags', { value });
      });

      if (result === null) { // ai-review: intentional — early return; result.id is never accessed below
        track('entity_create_fail', { page: 'tags', entity_type: 'tag', error_code: 'RESOURCE_LOCKED' });
        if (inlineCreate) inlineCreate.setError('系统正在编辑中，请稍后重试');
        return;
      }

      try {
        track('entity_create_success', { page: 'tags', entity_type: 'tag', entity_id: result.id });
        showToast('标签已创建');
        if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_create_fail', { page: 'tags', entity_type: 'tag', error_code: e.code });
          if (inlineCreate) inlineCreate.setError(e.message);
        }
      }
    },
    onCancel: () => {
      inlineCreate = null;
    }
  });
}

function editTag(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  const t = tags.find(x => x.id === id);
  if (!t) return;

  track('entity_update_start', { page: 'tags', entity_type: 'tag', entity_id: id });

  const row = document.querySelector(`[data-testid="tags-row-${id}"]`);
  new InlineEditor(row, {
    fields: [
      { name: 'value', label: '标签名称 *', type: 'text', value: t.value, required: true }
    ],
    onSave: async (data) => {
      const value = data.value.trim();
      if (!value) { return; }

      track('entity_update_submit', { page: 'tags', entity_type: 'tag', entity_id: id });

      const result = await withLock(async () => {
        return await api.put('/tags/' + id, { value });
      });

      if (result === null) {
        track('entity_update_fail', { page: 'tags', entity_type: 'tag', entity_id: id, error_code: 'RESOURCE_LOCKED' });
        showToast('系统正在编辑中，请稍后重试', 'warning');
        load(); // restore row
        return;
      }

      try {
        track('entity_update_success', { page: 'tags', entity_type: 'tag', entity_id: id });
        showToast('标签已更新');
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_update_fail', { page: 'tags', entity_type: 'tag', entity_id: id, error_code: e.code });
          showToast(e.message, 'error');
          load();
        }
      }
    },
    onCancel: () => {}
  });
}

function deleteTag(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_delete_start', { page: 'tags', entity_type: 'tag', entity_id: id });

  const row = document.querySelector(`[data-testid="tags-row-${id}"]`);
  createInlineConfirm(row, {
    onConfirm: async () => {
      track('entity_delete_confirm', { page: 'tags', entity_type: 'tag', entity_id: id });

      const result = await withLock(async () => {
        await api.delete('/tags/' + id);
        return true;
      });

      if (result === null) {
        showToast('系统正在编辑中，请稍后重试', 'warning');
        load();
        return;
      }

      try {
        track('entity_delete_success', { page: 'tags', entity_type: 'tag' });
        showToast('标签已删除');
        load();
      } catch (e) {
        if (e instanceof ApiError) showToast(e.message, 'error');
        load();
      }
    },
    onCancel: () => {
      track('entity_delete_cancel', { page: 'tags', entity_type: 'tag', entity_id: id });
    }
  });
}

document.getElementById('btnAdd').addEventListener('click', startCreate);
document.getElementById('btnAdd').setAttribute('data-testid', 'tags-add-btn');
document.getElementById('btnAdd').classList.add('mutating-btn');
document.getElementById('tagsTable').closest('table').setAttribute('data-testid', 'tags-table');
document.getElementById('emptyState').setAttribute('data-testid', 'tags-empty-state');

load();
