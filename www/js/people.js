buildNavBar('people');
track('page_view', { page: 'people' });

let people = [], teams = [], tags = [], products_l1 = [], products_l2 = [];
let sortKey = '', sortDir = 1; // 1=asc, -1=desc
let inlineCreate = null;
let activeEditor = null;

const SORT_LABELS = {
  name: '姓名', employeeId: '工号', level: '职级',
  team: '团队', location: '所在地', manager: '上级',
};

async function load() {
  try {
    const name = document.getElementById('filterName').value;
    const teamId = document.getElementById('filterTeam').value;
    const location = document.getElementById('filterLocation').value;
    const tagId = document.getElementById('filterTag').value;
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (teamId) params.set('teamId', teamId);
    if (location) params.set('location', location);

    [people, teams, tags, products_l1, products_l2] = await Promise.all([
      api.get('/people?' + params.toString()),
      api.get('/teams'),
      api.get('/tags'),
      api.get('/products/l1'),
      api.get('/products/l2'),
    ]);

    if (tagId) {
      people = people.filter(p => (p.tagIds || []).includes(tagId));
    }
    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

async function loadFilters() {
  try {
    const [teamsData, peopleData, tagsData] = await Promise.all([
      api.get('/teams'), api.get('/people'), api.get('/tags'),
    ]);
    const tSel = document.getElementById('filterTeam');
    tSel.innerHTML = '<option value="">全部团队</option>' + teamsData.map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('');
    const locs = [...new Set(peopleData.map(p => p.location).filter(Boolean))];
    const lSel = document.getElementById('filterLocation');
    lSel.innerHTML = '<option value="">全部地点</option>' + locs.map(l => `<option value="${escHtml(l)}">${escHtml(l)}</option>`).join('');
    const tagSel = document.getElementById('filterTag');
    tagSel.innerHTML = '<option value="">全部标签</option>' + tagsData.map(t => `<option value="${t.id}">${escHtml(t.value)}</option>`).join('');
  } catch (e) { /* ignore */ }
}

function render() {
  const tbody = document.getElementById('peopleTable');
  const empty = document.getElementById('emptyState');
  document.getElementById('peopleCount').textContent = `共 ${people.length} 个`;
  if (!people.length) { tbody.innerHTML = ''; empty.style.display = 'block'; return; }
  empty.style.display = 'none';

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const personMap = Object.fromEntries(people.map(p => [p.id, p.name]));
  const tagMap = Object.fromEntries(tags.map(t => [t.id, t.value]));

  let sorted = [...people];
  if (sortKey) {
    sorted.sort((a, b) => {
      let va, vb;
      switch (sortKey) {
        case 'name': va = a.name; vb = b.name; break;
        case 'employeeId': va = a.employeeId || ''; vb = b.employeeId || ''; break;
        case 'level': va = parseInt(a.level) || 0; vb = parseInt(b.level) || 0; break;
        case 'team': va = teamMap[a.teamId] || ''; vb = teamMap[b.teamId] || ''; break;
        case 'location': va = a.location || ''; vb = b.location || ''; break;
        case 'manager': va = personMap[a.managerId] || ''; vb = personMap[b.managerId] || ''; break;
        default: return 0;
      }
      return va < vb ? -sortDir : va > vb ? sortDir : 0;
    });
  }

  tbody.innerHTML = sorted.map(p => `
    <tr data-testid="people-row-${p.id}">
      <td><strong>${escHtml(p.name)}</strong></td>
      <td>${escHtml(p.employeeId || '-')}</td>
      <td>${escHtml(p.level || '-')}</td>
      <td>${escHtml(teamMap[p.teamId] || '-')}</td>
      <td>${escHtml(p.location || '-')}</td>
      <td>${escHtml(personMap[p.managerId] || '-')}</td>
      <td><div class="badge-row">${(p.tagIds||[]).map(tid => `<span class="badge badge-default">${escHtml(tagMap[tid]||tid)}</span>`).join('')}</div></td>
      <td class="actions">
        <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editPerson('${p.id}')">编辑</button>
        <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deletePerson('${p.id}')">删除</button>
      </td>
    </tr>`).join('');

  if (typeof updateMutatingButtons === 'function') updateMutatingButtons();
}

function startCreate() {
  if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }
  if (activeEditor) { activeEditor.destroy(); activeEditor = null; }

  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_create_start', { page: 'people', entity_type: 'person' });

  const teamOpts = teams.map(t => ({ id: t.id, label: t.name }));
  const managerOpts = people.map(x => ({ id: x.id, label: x.name })); // ai-review: intentional — create mode has no self to filter
  const tagOpts = tags.map(t => ({ id: t.id, label: t.value }));
  const l1Opts = products_l1.map(x => ({ id: x.id, label: x.name }));
  const l2Opts = products_l2.map(x => ({ id: x.id, label: x.name }));

  inlineCreate = new InlineCreateRow(document.getElementById('peopleTable'), {
    useColspan: true,
    fields: [
      { name: 'name', label: '姓名 *', type: 'text', placeholder: '姓名', required: true },
      { name: 'employeeId', label: '工号', type: 'text', placeholder: '工号' },
      { name: 'level', label: '职级', type: 'text', placeholder: '职级' },
      { name: 'location', label: '所在地', type: 'text', placeholder: '所在地' },
      { name: 'teamId', label: '团队', type: 'select', options: teamOpts },
      { name: 'managerId', label: '上级', type: 'select', options: managerOpts },
      { name: 'tagIds', label: '标签', type: 'multiselect', options: tagOpts },
      { name: 'l1ProductIds', label: 'L1产品', type: 'multiselect', options: l1Opts },
      { name: 'l2ProductIds', label: 'L2产品', type: 'multiselect', options: l2Opts },
    ],
    onSave: async (data) => {
      if (!data.name.trim()) { inlineCreate.setError('姓名不能为空'); return; }

      const payload = {
        name: data.name.trim(),
        employeeId: data.employeeId || null,
        level: data.level || null,
        location: data.location || null,
        teamId: data.teamId || null,
        managerId: data.managerId || null,
        tagIds: data.tagIds || [],
        l1ProductIds: data.l1ProductIds || [],
        l2ProductIds: data.l2ProductIds || [],
      };

      track('entity_create_submit', { page: 'people', entity_type: 'person' });
      inlineCreate.setSaving();

      const result = await withLock(async () => {
        return await api.post('/people', payload);
      });

      if (result === null) {
        track('entity_create_fail', { page: 'people', entity_type: 'person', error_code: 'RESOURCE_LOCKED' });
        inlineCreate.setError('系统正在编辑中，请稍后重试');
        return;
      }

      try {
        track('entity_create_success', { page: 'people', entity_type: 'person', entity_id: result.id });
        showToast('人员已创建');
        inlineCreate.destroy();
        inlineCreate = null;
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_create_fail', { page: 'people', entity_type: 'person', error_code: e.code });
          inlineCreate.setError(e.message);
        }
      }
    },
    onCancel: () => { inlineCreate = null; }
  });

  // Init MultiSelects after row is in DOM
  ['tagIds', 'l1ProductIds', 'l2ProductIds'].forEach(name => {
    const container = inlineCreate.row.querySelector(`[data-field="${name}"]`);
    if (container) {
      const field = inlineCreate.options.fields.find(f => f.name === name);
      const opts = name === 'tagIds' ? tagOpts : name === 'l1ProductIds' ? l1Opts : l2Opts;
      field._ms = new MultiSelect(container, opts, []);
    }
  });
}

function editPerson(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }
  if (activeEditor) { activeEditor.destroy(); activeEditor = null; }

  const p = people.find(x => x.id === id);
  if (!p) return;

  track('entity_update_start', { page: 'people', entity_type: 'person', entity_id: id });

  const teamOpts = teams.map(t => ({ id: t.id, label: t.name }));
  const managerOpts = people.filter(x => x.id !== id).map(x => ({ id: x.id, label: x.name }));
  const tagOpts = tags.map(t => ({ id: t.id, label: t.value }));

  const row = document.querySelector(`[data-testid="people-row-${id}"]`);
  const editor = new InlineEditor(row, {
    fields: [
      { name: 'name', label: '姓名 *', type: 'text', value: p.name, required: true },
      { name: 'employeeId', label: '工号', type: 'text', value: p.employeeId || '' },
      { name: 'level', label: '职级', type: 'text', value: p.level || '' },
      { name: 'location', label: '所在地', type: 'text', value: p.location || '' },
      { name: 'teamId', label: '团队', type: 'select', value: p.teamId || '', options: teamOpts },
      { name: 'managerId', label: '上级', type: 'select', value: p.managerId || '', options: managerOpts },
      { name: 'tagIds', label: '标签', type: 'multiselect', value: p.tagIds, options: tagOpts },
    ],
    onSave: async (data) => {
      if (!data.name.trim()) { editor.setError('姓名不能为空'); return; }

      const payload = {
        name: data.name.trim(),
        employeeId: data.employeeId || null,
        level: data.level || null,
        location: data.location || null,
        teamId: data.teamId || null,
        managerId: data.managerId || null,
        tagIds: data.tagIds || [],
        l1ProductIds: p.l1ProductIds || [],
        l2ProductIds: p.l2ProductIds || [],
      };

      track('entity_update_submit', { page: 'people', entity_type: 'person', entity_id: id });
      editor.setSaving();

      const result = await withLock(async () => {
        return await api.put('/people/' + id, payload);
      });

      if (result === null) {
        track('entity_update_fail', { page: 'people', entity_type: 'person', entity_id: id, error_code: 'RESOURCE_LOCKED' });
        showToast('系统正在编辑中，请稍后重试', 'warning');
        activeEditor = null;
        load();
        return;
      }

      try {
        track('entity_update_success', { page: 'people', entity_type: 'person', entity_id: id });
        showToast('人员已更新');
        activeEditor = null;
        load();
      } catch (e) {
        if (e instanceof ApiError) {
          track('entity_update_fail', { page: 'people', entity_type: 'person', entity_id: id, error_code: e.code });
          showToast(e.message, 'error');
          activeEditor = null;
          load();
        }
      }
    },
    onCancel: () => { activeEditor = null; }
  });
  activeEditor = editor;

  // Init tag MultiSelect
  const tagContainer = editor.row.querySelector('[data-field="tagIds"]');
  if (tagContainer) {
    const field = editor.options.fields.find(f => f.name === 'tagIds');
    field._ms = new MultiSelect(tagContainer, tagOpts, p.tagIds || []);
  }
}

function deletePerson(id) {
  if (lockDisabled()) {
    showToast('系统正在编辑中，请稍后重试', 'warning');
    return;
  }

  track('entity_delete_start', { page: 'people', entity_type: 'person', entity_id: id });

  const row = document.querySelector(`[data-testid="people-row-${id}"]`);
  createInlineConfirm(row, {
    onConfirm: async () => {
      track('entity_delete_confirm', { page: 'people', entity_type: 'person', entity_id: id });

      const result = await withLock(async () => { await api.delete('/people/' + id); return true; });
      if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); load(); return; }

      try {
        track('entity_delete_success', { page: 'people', entity_type: 'person' });
        showToast('人员已删除');
        load();
      } catch (e) {
        if (e instanceof ApiError) showToast(e.message, 'error');
        load();
      }
    },
    onCancel: () => { track('entity_delete_cancel', { page: 'people', entity_type: 'person', entity_id: id }); }
  });
}

// Event listeners
document.getElementById('filterName').addEventListener('input', debounce(load, 300));
document.getElementById('filterTeam').addEventListener('change', () => { track('list_filter', { page: 'people', filter_key: 'team' }); load(); });
document.getElementById('filterLocation').addEventListener('change', () => { track('list_filter', { page: 'people', filter_key: 'location' }); load(); });
document.getElementById('filterTag').addEventListener('change', () => { track('list_filter', { page: 'people', filter_key: 'tag' }); load(); });
document.getElementById('btnAdd').addEventListener('click', startCreate);

// Table header sort
document.querySelector('thead').addEventListener('click', e => {
  const th = e.target.closest('th.sortable');
  if (!th) return;
  const key = th.dataset.sort;
  if (sortKey === key) { sortDir *= -1; }
  else { sortKey = key; sortDir = 1; }
  document.querySelectorAll('th.sortable .sort-arrow').forEach(s => s.textContent = '');
  th.querySelector('.sort-arrow').textContent = sortDir > 0 ? ' ▲' : ' ▼';
  track('list_sort', { page: 'people', sort_key: key, sort_direction: sortDir > 0 ? 'asc' : 'desc' });
  render();
});

function debounce(fn, ms) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); }; }

// data-testid attributes
document.getElementById('filterName').setAttribute('data-testid', 'people-filter-name-input');
document.getElementById('filterTeam').setAttribute('data-testid', 'people-filter-team-select');
document.getElementById('filterLocation').setAttribute('data-testid', 'people-filter-location-select');
document.getElementById('filterTag').setAttribute('data-testid', 'people-filter-tag-select');
document.getElementById('btnAdd').setAttribute('data-testid', 'people-add-btn');
document.getElementById('btnAdd').classList.add('mutating-btn');
document.getElementById('peopleTable').closest('table').setAttribute('data-testid', 'people-table');
document.getElementById('peopleCount').setAttribute('data-testid', 'people-count-badge');
document.getElementById('emptyState').setAttribute('data-testid', 'people-empty-state');

// Sort header testids
document.querySelectorAll('th.sortable').forEach(th => {
  const key = th.dataset.sort;
  if (key) th.setAttribute('data-testid', `people-sort-${key}-header`);
});

(async () => { await loadFilters(); load(); })();
