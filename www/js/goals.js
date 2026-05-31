buildNavBar('goals');
track('page_view', { page: 'goals' });

let tab = 'l0';
let l0Goals = [], l1Goals = [], l2Goals = [];
let l1Products = [], l2Products = [];
let inlineCreate = null;

async function load() {
  try {
    [l0Goals, l1Goals, l2Goals, l1Products, l2Products] = await Promise.all([
      api.get('/goals/l0'), api.get('/goals/l1'), api.get('/goals/l2'),
      api.get('/products/l1'), api.get('/products/l2'),
    ]);
    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

function render() {
  const head = document.getElementById('goalTableHead');
  const body = document.getElementById('goalTable');
  const empty = document.getElementById('emptyState');
  const l1Map = Object.fromEntries(l1Products.map(p => [p.id, p.name]));
  const l2Map = Object.fromEntries(l2Products.map(p => [p.id, p.name]));

  const counts = { l0: l0Goals.length, l1: l1Goals.length, l2: l2Goals.length };
  document.getElementById('goalCount').textContent = `共 ${counts[tab]} 个`;

  if (tab === 'l0') {
    head.innerHTML = '<tr><th>目标内容</th><th>衡量标准</th><th>关联 L1 目标</th><th style="width:80px"></th></tr>';
    if (!l0Goals.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = l0Goals.map(g => `
      <tr data-testid="goals-row-${g.id}">
        <td><strong>${escHtml(g.content)}</strong></td>
        <td>${escHtml(g.standard || '-')}</td>
        <td><span class="text-link" data-testid="linked-goals-panel" onclick="toggleLinkedL1('${g.id}')">${(g.l1GoalIds||[]).length} 个关联</span></td>
        <td class="actions">
          <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editGoal('${g.id}')">编辑</button>
          <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deleteGoal('${g.id}')">删除</button>
        </td>
      </tr>`).join('');
  } else if (tab === 'l1') {
    head.innerHTML = '<tr><th>目标内容</th><th>衡量标准</th><th>所属产品</th><th>关联 L0/L2</th><th style="width:80px"></th></tr>';
    if (!l1Goals.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = l1Goals.map(g => `
      <tr data-testid="goals-row-${g.id}">
        <td><strong>${escHtml(g.content)}</strong></td>
        <td>${escHtml(g.standard || '-')}</td>
        <td>${escHtml(l1Map[g.l1ProductId] || '-')}</td>
        <td><span class="text-link" onclick="toggleLinkedL1('${g.id}')">${(g.l0GoalIds||[]).length + (g.l2GoalIds||[]).length} 个关联</span></td>
        <td class="actions">
          <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editGoal('${g.id}')">编辑</button>
          <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deleteGoal('${g.id}')">删除</button>
        </td>
      </tr>`).join('');
  } else {
    head.innerHTML = '<tr><th>目标内容</th><th>衡量标准</th><th>所属 L2 产品</th><th>关联 L1 目标</th><th style="width:80px"></th></tr>';
    if (!l2Goals.length) { body.innerHTML = ''; empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    body.innerHTML = l2Goals.map(g => `
      <tr data-testid="goals-row-${g.id}">
        <td><strong>${escHtml(g.content)}</strong></td>
        <td>${escHtml(g.standard || '-')}</td>
        <td>${escHtml(l2Map[g.l2ProductId] || '-')}</td>
        <td><span class="text-link" onclick="toggleLinkedL2('${g.id}')">${(g.l1GoalIds||[]).length} 个关联</span></td>
        <td class="actions">
          <button class="btn btn-text btn-sm row-edit-btn" data-testid="row-edit-btn" onclick="editGoal('${g.id}')">编辑</button>
          <button class="btn btn-text btn-sm text-link-danger row-delete-btn" data-testid="row-delete-btn" onclick="deleteGoal('${g.id}')">删除</button>
        </td>
      </tr>`).join('');
  }
  if (typeof updateMutatingButtons === 'function') updateMutatingButtons();
}

function getL0Content(id) { const g = l0Goals.find(x => x.id === id); return g ? (g.content.slice(0,20)+(g.content.length>20?'...':'')) : id; }
function getL1Content(id) { const g = l1Goals.find(x => x.id === id); return g ? (g.content.slice(0,20)+(g.content.length>20?'...':'')) : id; }
function getL2Content(id) { const g = l2Goals.find(x => x.id === id); return g ? (g.content.slice(0,20)+(g.content.length>20?'...':'')) : id; }

function toggleLinkedL1(goalId) {
  const row = document.querySelector(`[data-testid="goals-row-${goalId}"]`);
  const existing = row?.nextElementSibling;
  if (existing && existing.classList.contains('expandable-panel')) { existing.remove(); return; }
  track('expand_row', { page: 'goals', entity_type: 'l0_goal', entity_id: goalId });

  let g;
  if (tab === 'l0') g = l0Goals.find(x => x.id === goalId);
  else g = l1Goals.find(x => x.id === goalId);
  if (!g) return;

  const linkedIds = g.l1GoalIds || (tab === 'l1' ? g.l0GoalIds : []);
  const allLinked = (tab === 'l0') ? linkedIds.map(id => getL1Content(id)) : linkedIds.map(id => getL0Content(id));

  const panel = document.createElement('tr');
  panel.className = 'expandable-panel';
  panel.setAttribute('data-testid', 'linked-goals-panel');
  panel.innerHTML = `<td colspan="4">
    <div class="panel-title">关联目标</div>
    <div class="badge-row">${allLinked.length ? allLinked.map(c => `<span class="badge badge-default">${escHtml(c)}</span>`).join('') : '<span style="color:var(--muted)">暂无关联</span>'}</div>
  </td>`;
  row.parentNode.insertBefore(panel, row.nextSibling);
}

function toggleLinkedL2(goalId) {
  const row = document.querySelector(`[data-testid="goals-row-${goalId}"]`);
  const existing = row?.nextElementSibling;
  if (existing && existing.classList.contains('expandable-panel')) { existing.remove(); return; }
  track('expand_row', { page: 'goals', entity_type: 'l2_goal', entity_id: goalId });

  const g = l2Goals.find(x => x.id === goalId);
  if (!g) return;
  const linked = (g.l1GoalIds || []).map(id => getL1Content(id));

  const panel = document.createElement('tr');
  panel.className = 'expandable-panel';
  panel.setAttribute('data-testid', 'linked-goals-panel');
  panel.innerHTML = `<td colspan="4">
    <div class="panel-title">关联 L1 目标</div>
    <div class="badge-row">${linked.length ? linked.map(c => `<span class="badge badge-default">${escHtml(c)}</span>`).join('') : '<span style="color:var(--muted)">暂无关联</span>'}</div>
  </td>`;
  row.parentNode.insertBefore(panel, row.nextSibling);
}

function startCreate() {
  if (inlineCreate) { inlineCreate.destroy(); inlineCreate = null; }
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_create_start', { page: 'goals', entity_type: tab + '_goal' });

  const l1ProdOpts = l1Products.map(p => ({ id: p.id, label: p.name }));
  const l2ProdOpts = l2Products.map(p => ({ id: p.id, label: p.name }));
  let fields;

  if (tab === 'l0') {
    fields = [
      { name: 'content', label: '目标内容 *', type: 'text', placeholder: '目标内容', required: true },
      { name: 'standard', label: '衡量标准', type: 'text', placeholder: '衡量标准' },
      { name: 'l1GoalIds', label: '关联 L1 目标', type: 'multiselect', options: l1Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })) },
    ];
  } else if (tab === 'l1') {
    fields = [
      { name: 'l1ProductId', label: '所属 L1 产品 *', type: 'select', options: l1ProdOpts, required: true },
      { name: 'content', label: '目标内容 *', type: 'text', placeholder: '目标内容', required: true },
      { name: 'standard', label: '衡量标准', type: 'text', placeholder: '衡量标准' },
      { name: 'l0GoalIds', label: '关联 L0 目标', type: 'multiselect', options: l0Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })) },
      { name: 'l2GoalIds', label: '关联 L2 目标', type: 'multiselect', options: l2Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })) },
    ];
  } else {
    fields = [
      { name: 'l2ProductId', label: '所属 L2 产品 *', type: 'select', options: l2ProdOpts, required: true },
      { name: 'content', label: '目标内容 *', type: 'text', placeholder: '目标内容', required: true },
      { name: 'standard', label: '衡量标准', type: 'text', placeholder: '衡量标准' },
      { name: 'l1GoalIds', label: '关联 L1 目标', type: 'multiselect', options: l1Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })) },
    ];
  }

  inlineCreate = new InlineCreateRow(document.getElementById('goalTable'), {
    useColspan: true,
    fields,
    onSave: async (data) => {
      if (tab !== 'l0' && !data.content.trim()) return;
      track('entity_create_submit', { page: 'goals', entity_type: tab + '_goal' });
      inlineCreate.setSaving();
      try {
        let result;
        if (tab === 'l0') result = await withLock(async () => await api.post('/goals/l0', { content: data.content, standard: data.standard || null, l1GoalIds: data.l1GoalIds || [] }));
        else if (tab === 'l1') result = await withLock(async () => await api.post('/goals/l1', { l1ProductId: data.l1ProductId, content: data.content, standard: data.standard || null, l0GoalIds: data.l0GoalIds || [], l2GoalIds: data.l2GoalIds || [] }));
        else result = await withLock(async () => await api.post('/goals/l2', { l2ProductId: data.l2ProductId, content: data.content, standard: data.standard || null, l1GoalIds: data.l1GoalIds || [] }));

        if (result === null) { inlineCreate.setError('系统正在编辑中，请稍后重试'); return; }
        track('entity_create_success', { page: 'goals', entity_type: tab + '_goal', entity_id: result.id });
        showToast('目标已创建');
        inlineCreate.destroy(); inlineCreate = null;
        load();
      } catch (e) { if (e instanceof ApiError) { track('entity_create_fail', { page: 'goals', entity_type: tab + '_goal', error_code: e.code }); inlineCreate.setError(e.message); } }
    },
    onCancel: () => { inlineCreate = null; }
  });

  // Init MultiSelects after render
  const row = inlineCreate.row;
  row.querySelectorAll('[data-field]').forEach(container => {
    const fieldName = container.dataset.field;
    const field = fields.find(f => f.name === fieldName);
    if (field && field.type === 'multiselect') {
      field._ms = new MultiSelect(container, field.options, []);
    }
  });
}

function editGoal(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_update_start', { page: 'goals', entity_type: tab + '_goal', entity_id: id });

  let g, fields;
  const l1ProdOpts = l1Products.map(p => ({ id: p.id, label: p.name }));
  const l2ProdOpts = l2Products.map(p => ({ id: p.id, label: p.name }));

  if (tab === 'l0') {
    g = l0Goals.find(x => x.id === id);
    fields = [
      { name: 'content', label: '目标内容 *', type: 'text', value: g.content, required: true },
      { name: 'standard', label: '衡量标准', type: 'text', value: g.standard || '' },
      { name: 'l1GoalIds', label: '关联 L1 目标', type: 'multiselect', options: l1Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })), value: g.l1GoalIds },
    ];
  } else if (tab === 'l1') {
    g = l1Goals.find(x => x.id === id);
    fields = [
      { name: 'l1ProductId', label: '所属 L1 产品 *', type: 'select', value: g.l1ProductId || '', options: l1ProdOpts, required: true },
      { name: 'content', label: '目标内容 *', type: 'text', value: g.content, required: true },
      { name: 'standard', label: '衡量标准', type: 'text', value: g.standard || '' },
      { name: 'l0GoalIds', label: '关联 L0 目标', type: 'multiselect', options: l0Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })), value: g.l0GoalIds },
      { name: 'l2GoalIds', label: '关联 L2 目标', type: 'multiselect', options: l2Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })), value: g.l2GoalIds },
    ];
  } else {
    g = l2Goals.find(x => x.id === id);
    fields = [
      { name: 'l2ProductId', label: '所属 L2 产品 *', type: 'select', value: g.l2ProductId || '', options: l2ProdOpts, required: true },
      { name: 'content', label: '目标内容 *', type: 'text', value: g.content, required: true },
      { name: 'standard', label: '衡量标准', type: 'text', value: g.standard || '' },
      { name: 'l1GoalIds', label: '关联 L1 目标', type: 'multiselect', options: l1Goals.map(x => ({ id: x.id, label: x.content.slice(0,30) })), value: g.l1GoalIds },
    ];
  }

  const row = document.querySelector(`[data-testid="goals-row-${g.id}"]`);
  const editor = new InlineEditor(row, {
    fields,
    onSave: async (data) => {
      track('entity_update_submit', { page: 'goals', entity_type: tab + '_goal', entity_id: id });
      editor.setSaving();
      try {
        let result;
        if (tab === 'l0') result = await withLock(async () => await api.put('/goals/l0/' + id, { content: data.content, standard: data.standard || null, l1GoalIds: data.l1GoalIds || [] }));
        else if (tab === 'l1') result = await withLock(async () => await api.put('/goals/l1/' + id, { l1ProductId: data.l1ProductId, content: data.content, standard: data.standard || null, l0GoalIds: data.l0GoalIds || [], l2GoalIds: data.l2GoalIds || [] }));
        else result = await withLock(async () => await api.put('/goals/l2/' + id, { l2ProductId: data.l2ProductId, content: data.content, standard: data.standard || null, l1GoalIds: data.l1GoalIds || [] }));

        if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); load(); return; }
        track('entity_update_success', { page: 'goals', entity_type: tab + '_goal', entity_id: id });
        showToast('目标已更新');
        load();
      } catch (e) { if (e instanceof ApiError) { track('entity_update_fail', { page: 'goals', entity_type: tab + '_goal', entity_id: id, error_code: e.code }); showToast(e.message, 'error'); load(); } }
    },
    onCancel: () => {}
  });

  // Init MultiSelects
  editor.row.querySelectorAll('[data-field]').forEach(container => {
    const fieldName = container.dataset.field;
    const field = fields.find(f => f.name === fieldName);
    if (field && field.type === 'multiselect') {
      field._ms = new MultiSelect(container, field.options, field.value || []);
    }
  });
}

function deleteGoal(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_delete_start', { page: 'goals', entity_type: tab + '_goal', entity_id: id });

  const row = document.querySelector(`[data-testid="goals-row-${id}"]`);
  const path = tab === 'l0' ? '/goals/l0/' : tab === 'l1' ? '/goals/l1/' : '/goals/l2/';

  createInlineConfirm(row, {
    onConfirm: async () => {
      track('entity_delete_confirm', { page: 'goals', entity_type: tab + '_goal', entity_id: id });
      const result = await withLock(async () => { await api.delete(path + id); return true; });
      if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); load(); return; }
      try { track('entity_delete_success', { page: 'goals', entity_type: tab + '_goal', entity_id: id }); showToast('目标已删除'); load(); }
      catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); load(); }
    },
    onCancel: () => { track('entity_delete_cancel', { page: 'goals', entity_type: tab + '_goal', entity_id: id }); }
  });
}

// Tab switching
document.getElementById('goalTabs').addEventListener('click', e => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('#goalTabs .tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  tab = btn.dataset.tab;
  track('page_view', { page: 'goals', tab });
  render();
});

document.getElementById('btnAdd').addEventListener('click', startCreate);
document.getElementById('btnAdd').setAttribute('data-testid', 'goals-add-btn');
document.getElementById('btnAdd').classList.add('mutating-btn');
document.getElementById('goalTable').closest('table').setAttribute('data-testid', 'goals-table');
document.getElementById('emptyState').setAttribute('data-testid', 'goals-empty-state');
document.querySelectorAll('.tab').forEach((t, i) => t.setAttribute('data-testid', `goals-${['l0','l1','l2'][i]}-tab`));

load();
