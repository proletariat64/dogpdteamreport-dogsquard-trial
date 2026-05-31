buildNavBar('teams');
track('page_view', { page: 'teams' });

let teams = [], tags = [], people = [];
let inlineCreate = null;

async function load() {
  try {
    [teams, tags, people] = await Promise.all([
      api.get('/teams'), api.get('/tags'), api.get('/people')
    ]);
    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

function render() {
  const tbody = document.getElementById('teamsTable');
  const empty = document.getElementById('emptyState');
  document.getElementById('teamCount').textContent = `共 ${teams.length} 个`;
  if (!teams.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const tagMap = Object.fromEntries(tags.map(t => [t.id, t.value]));
  tbody.innerHTML = teams.map(t => {
    const memberCount = people.filter(p => p.teamId === t.id).length;
    return `
    <tr data-testid="teams-row-${t.id}">
      <td>
        <span class="expand-icon" data-testid="row-expand-btn" onclick="toggleTeamExpand('${t.id}')" style="cursor:pointer">▸</span>
        <strong>${escHtml(t.name)}</strong>
        <span style="color:var(--muted);font-size:12px;margin-left:var(--space-xs)">(${memberCount}人)</span>
      </td>
      <td><div class="badge-row">${(t.tagIds||[]).map(tid => `<span class="badge badge-default">${escHtml(tagMap[tid]||tid)}</span>`).join('')}</div></td>
      <td class="actions">
        <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editTeam('${t.id}')">编辑</button>
        <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deleteTeam('${t.id}')">删除</button>
      </td>
    </tr>`;
  }).join('');

  if (typeof updateMutatingButtons === 'function') updateMutatingButtons();
}

function toggleTeamExpand(teamId) {
  const row = document.querySelector(`[data-testid="teams-row-${teamId}"]`);
  const icon = row.querySelector('.expand-icon');
  const existing = row.nextElementSibling;

  if (existing && existing.classList.contains('expandable-panel')) {
    existing.remove();
    icon.classList.remove('open');
    track('collapse_row', { page: 'teams', entity_type: 'team', entity_id: teamId });
    return;
  }

  icon.classList.add('open');
  track('expand_row', { page: 'teams', entity_type: 'team', entity_id: teamId });

  const members = people.filter(p => p.teamId === teamId);
  const panel = document.createElement('tr');
  panel.className = 'expandable-panel';
  panel.setAttribute('data-testid', 'row-expanded-panel');
  panel.innerHTML = `
    <td colspan="3">
      <div class="panel-title">团队成员 (${members.length}人)</div>
      <div data-testid="expanded-people-list">
        ${members.length ? members.map(p =>
          `<span class="badge badge-default" style="margin:2px">${escHtml(p.name)}${p.level ? ' (' + escHtml(p.level) + ')' : ''}</span>`
        ).join('') : '<span style="color:var(--muted)">暂无成员</span>'}
      </div>
    </td>`;
  row.parentNode.insertBefore(panel, row.nextSibling);
}

function startCreate() {
  if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }

  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_create_start', { page: 'teams', entity_type: 'team' });

  const tagOpts = tags.map(tg => ({ id: tg.id, label: tg.value }));

  inlineCreate = new InlineCreateRow(document.getElementById('teamsTable'), {
    fields: [
      { name: 'name', label: '团队名称 *', type: 'text', placeholder: '输入团队名称', required: true },
      { name: 'tagIds', label: '标签', type: 'multiselect', options: tagOpts }
    ],
    onSave: async (data) => {
      const name = data.name.trim();
      if (!name) { inlineCreate.setError('团队名称不能为空'); return; }

      track('entity_create_submit', { page: 'teams', entity_type: 'team' });
      inlineCreate.setSaving();

      const result = await withLock(async () => {
        return await api.post('/teams', { name, tagIds: data.tagIds || [] });
      });

      if (result === null) {
        track('entity_create_fail', { page: 'teams', entity_type: 'team', error_code: 'RESOURCE_LOCKED' });
        inlineCreate.setError('系统正在编辑中，请稍后重试');
        return;
      }

      try {
        track('entity_create_success', { page: 'teams', entity_type: 'team', entity_id: result.id });
        showToast('团队已创建');
        inlineCreate.destroy();
        inlineCreate = null;
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_create_fail', { page: 'teams', entity_type: 'team', error_code: e.code });
          inlineCreate.setError(e.message);
        }
      }
    },
    onCancel: () => { inlineCreate = null; }
  });

  // Initialize MultiSelect after row is in DOM
  const msContainer = inlineCreate.row.querySelector('[data-field="tagIds"]');
  if (msContainer) {
    const field = inlineCreate.options.fields.find(f => f.name === 'tagIds');
    field._ms = new MultiSelect(msContainer, tagOpts, []);
  }
}

function editTeam(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  const t = teams.find(x => x.id === id);
  if (!t) return;

  track('entity_update_start', { page: 'teams', entity_type: 'team', entity_id: id });

  const tagOpts = tags.map(tg => ({ id: tg.id, label: tg.value }));
  const row = document.querySelector(`[data-testid="teams-row-${id}"]`);

  const editor = new InlineEditor(row, {
    fields: [
      { name: 'name', label: '团队名称 *', type: 'text', value: t.name, required: true },
      { name: 'tagIds', label: '标签', type: 'multiselect', options: tagOpts, value: t.tagIds }
    ],
    onSave: async (data) => {
      const name = data.name.trim();
      if (!name) { editor.setError('团队名称不能为空'); return; }

      track('entity_update_submit', { page: 'teams', entity_type: 'team', entity_id: id });
      editor.setSaving();

      const result = await withLock(async () => {
        return await api.put('/teams/' + id, { name, tagIds: data.tagIds || [] });
      });

      if (result === null) {
        track('entity_update_fail', { page: 'teams', entity_type: 'team', entity_id: id, error_code: 'RESOURCE_LOCKED' });
        showToast('系统正在编辑中，请稍后重试', 'warning');
        load();
        return;
      }

      try {
        track('entity_update_success', { page: 'teams', entity_type: 'team', entity_id: id });
        showToast('团队已更新');
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_update_fail', { page: 'teams', entity_type: 'team', entity_id: id, error_code: e.code });
          showToast(e.message, 'error');
          load();
        }
      }
    },
    onCancel: () => {}
  });

  // Initialize MultiSelect for the inline edit row
  const msContainer = row.querySelector('[data-field="tagIds"]');
  if (msContainer) {
    const field = editor.options.fields.find(f => f.name === 'tagIds');
    field._ms = new MultiSelect(msContainer, tagOpts, t.tagIds || []);
  }
}

function deleteTeam(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_delete_start', { page: 'teams', entity_type: 'team', entity_id: id });

  const row = document.querySelector(`[data-testid="teams-row-${id}"]`);
  createInlineConfirm(row, {
    onConfirm: async () => {
      track('entity_delete_confirm', { page: 'teams', entity_type: 'team', entity_id: id });

      const result = await withLock(async () => {
        await api.delete('/teams/' + id);
        return true;
      });

      if (result === null) {
        showToast('系统正在编辑中，请稍后重试', 'warning');
        load();
        return;
      }

      try {
        track('entity_delete_success', { page: 'teams', entity_type: 'team' });
        showToast('团队已删除');
        load();
      } catch (e) {
        if (e instanceof ApiError) showToast(e.message, 'error');
        load();
      }
    },
    onCancel: () => {
      track('entity_delete_cancel', { page: 'teams', entity_type: 'team', entity_id: id });
    }
  });
}

document.getElementById('btnAdd').addEventListener('click', startCreate);
document.getElementById('btnAdd').setAttribute('data-testid', 'teams-add-btn');
document.getElementById('btnAdd').classList.add('mutating-btn');
document.getElementById('teamsTable').closest('table').setAttribute('data-testid', 'teams-table');
document.getElementById('emptyState').setAttribute('data-testid', 'teams-empty-state');

load();
