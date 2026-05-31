buildNavBar('products');
track('page_view', { page: 'products' });

let l1Products = [], l2Products = [], teams = [], people = [];
let expandedL1 = new Set();
let editingL1 = null; // id of L1 currently being edited, null if none
let editingL2 = null; // id of L2 currently being edited
let creatingL1 = false;
let creatingL2For = null; // l1Id being created under

async function load() {
  try {
    [l1Products, l2Products, teams, people] = await Promise.all([
      api.get('/products/l1'), api.get('/products/l2'), api.get('/teams'), api.get('/people'),
    ]);

    // Parse ?focus= param for drill-down from dashboard
    const params = new URLSearchParams(window.location.search);
    const focus = params.get('focus');
    if (focus && l1Products.find(l1 => l1.id === focus)) {
      expandedL1.add(focus);
    }

    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

function render() {
  const tree = document.getElementById('productTree');
  const empty = document.getElementById('emptyState');
  document.getElementById('productCount').textContent =
    `共 ${l1Products.length} 个 L1，${l2Products.length} 个 L2`;

  if (!l1Products.length && !l2Products.length) {
    tree.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const personMap = Object.fromEntries(people.map(p => [p.id, p.name]));
  const l2ByL1 = {};
  for (const l2 of l2Products) {
    (l2ByL1[l2.l1Id] = l2ByL1[l2.l1Id] || []).push(l2);
  }

  const sortBy = document.getElementById('sortBy').value;
  let sortedL1 = [...l1Products];
  if (sortBy === 'name') sortedL1.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  else if (sortBy === 'code') sortedL1.sort((a, b) => a.code.localeCompare(b.code));
  else if (sortBy === 'team') sortedL1.sort((a, b) => (teamMap[a.teamId] || '').localeCompare(teamMap[b.teamId] || '', 'zh-CN'));

  const orphanL2s = l2Products.filter(l2 => !l1Products.find(l1 => l1.id === l2.l1Id));

  let html = '';

  // L1 create form
  if (creatingL1) {
    html += renderL1CreateForm(teamMap, personMap);
  }

  html += sortedL1.map(l1 => {
    const children = l2ByL1[l1.id] || [];
    const isOpen = expandedL1.has(l1.id);
    const isEditing = editingL1 === l1.id;

    return `
    <div class="card l1-card" style="margin-bottom:var(--space-sm);padding:var(--space-md) var(--space-lg)" data-testid="products-l1-card-${l1.id}">
      ${isEditing ? renderL1EditForm(l1, teamMap, personMap) : `
      <div class="l1-header" data-testid="l1-card-header">
        <span class="expand-icon ${isOpen ? 'open' : ''}" data-testid="dash-l1-expand-btn" style="cursor:pointer" onclick="toggleL1('${l1.id}')">▸</span>
        <span class="l1-name">${escHtml(l1.name)}</span>
        <span class="l1-code">${escHtml(l1.code)}</span>
        ${l1.teamId ? `<span class="badge badge-default">${escHtml(teamMap[l1.teamId] || l1.teamId)}</span>` : ''}
        <span class="badge badge-default">${children.length} 个 L2</span>
        <div style="flex:1"></div>
        <span style="font-size:12px;color:var(--muted)">${(l1.ownerIds||[]).map(oid => escHtml(personMap[oid]||oid)).join(', ') || '无负责人'}</span>
        <button class="btn btn-text btn-sm l1-edit-btn mutating-btn" data-testid="l1-edit-btn" onclick="event.stopPropagation();startEditL1('${l1.id}')">编辑</button>
        <button class="btn btn-text btn-sm text-link-danger l1-delete-btn mutating-btn" data-testid="l1-delete-btn" onclick="event.stopPropagation();deleteL1('${l1.id}')">删除</button>
      </div>`}
      ${isOpen ? `
      <div class="l1-detail" data-testid="dash-l1-detail-panel">
        <div class="l2-list" data-testid="l2-list">
          ${children.length ? children.map(l2 => {
            const isEditingL2 = editingL2 === l2.id;
            return isEditingL2 ? renderL2EditForm(l2, l1.id, personMap) : `
            <div class="l2-item" data-testid="l2-row-${l2.id}" style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs) 0">
              <strong style="color:var(--body-strong);font-size:14px">${escHtml(l2.name)}</strong>
              <span class="code">${escHtml(l2.code)}</span>
              <div style="flex:1"></div>
              <span style="font-size:12px;color:var(--muted)">${(l2.ownerIds||[]).map(oid => escHtml(personMap[oid]||oid)).join(', ') || '无负责人'}</span>
              <button class="btn btn-text btn-sm l2-edit-btn mutating-btn" data-testid="l2-edit-btn" onclick="startEditL2('${l2.id}')">编辑</button>
              <button class="btn btn-text btn-sm text-link-danger l2-delete-btn mutating-btn" data-testid="l2-delete-btn" onclick="deleteL2('${l2.id}')">删除</button>
            </div>`;
          }).join('') : `<div style="padding:var(--space-xs) 0;color:var(--muted);font-size:13px">暂无 L2 产品</div>`}
          ${creatingL2For === l1.id ? renderL2CreateForm(l1.id, personMap) : `
          <div style="padding:var(--space-xs) 0">
            <button class="btn btn-text btn-sm l2-add-btn mutating-btn" data-testid="l2-add-btn" style="color:var(--primary)" onclick="startCreateL2('${l1.id}')">+ 添加 L2 产品</button>
          </div>`}
        </div>
      </div>` : ''}
    </div>`;
  }).join('');

  if (orphanL2s.length) {
    html += `
    <div class="card" style="margin-top:var(--space-md);padding:var(--space-md) var(--space-lg);border:1px dashed var(--warning)">
      <h4 style="color:var(--warning);margin-bottom:var(--space-sm)">未归属 L2 产品</h4>
      ${orphanL2s.map(l2 => `
        <div class="l2-item" data-testid="l2-row-${l2.id}" style="display:flex;align-items:center;gap:var(--space-sm);padding:var(--space-xs) 0">
          <strong style="color:var(--body-strong);font-size:14px">${escHtml(l2.name)}</strong>
          <span class="code">${escHtml(l2.code)}</span>
          <div style="flex:1"></div>
          <span style="font-size:12px;color:var(--muted)">${(l2.ownerIds||[]).map(oid => escHtml(personMap[oid]||oid)).join(', ') || '无负责人'}</span>
          <button class="btn btn-text btn-sm mutating-btn" onclick="startEditL2('${l2.id}')">编辑</button>
          <button class="btn btn-text btn-sm text-link-danger mutating-btn" onclick="deleteL2('${l2.id}')">删除</button>
        </div>`).join('')}
    </div>`;
  }

  tree.innerHTML = html;
  if (typeof updateMutatingButtons === 'function') updateMutatingButtons();
}

function renderL1CreateForm(teamMap, personMap) {
  const teamOpts = teams.map(t => ({ id: t.id, label: t.name }));
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  return `
    <div class="card" style="margin-bottom:var(--space-sm);padding:var(--space-md) var(--space-lg);background:var(--surface-cream-strong)" data-testid="l1-inline-create-form">
      <div style="display:flex;align-items:flex-end;gap:var(--space-sm);flex-wrap:wrap">
        <div class="form-group" style="margin-bottom:0;min-width:150px"><label class="form-label">名称 *</label><input class="form-input" id="fL1CreateName" data-testid="form-l1-name-input"></div>
        <div class="form-group" style="margin-bottom:0;min-width:120px"><label class="form-label">编码 *</label><input class="form-input" id="fL1CreateCode" data-testid="form-l1-code-input"></div>
        <div class="form-group" style="margin-bottom:0;min-width:150px"><label class="form-label">团队</label><select class="form-select" id="fL1CreateTeam" data-testid="form-l1-team-select"><option value="">--</option>${teamOpts.map(o => `<option value="${o.id}">${escHtml(o.label)}</option>`).join('')}</select></div>
        <div class="form-group" style="margin-bottom:0;min-width:200px"><label class="form-label">负责人</label><div id="fL1CreateOwners" data-testid="form-l1-owners-multiselect" style="position:relative"></div></div>
        <div class="inline-form-actions">
          <button class="btn btn-primary btn-sm" data-testid="form-save-btn" onclick="saveCreateL1()">保存</button>
          <button class="btn btn-secondary btn-sm" data-testid="form-cancel-btn" onclick="cancelCreateL1()">取消</button>
          <span class="inline-error-text" data-testid="inline-error-text" style="display:none" id="l1CreateError"></span>
        </div>
      </div>
    </div>`;
}

function renderL1EditForm(l1, teamMap, personMap) {
  const teamOpts = teams.map(t => ({ id: t.id, label: t.name }));
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  return `
    <div data-testid="l1-inline-edit-form" style="display:flex;align-items:flex-end;gap:var(--space-sm);flex-wrap:wrap">
      <div class="form-group" style="margin-bottom:0;min-width:150px"><label class="form-label">名称 *</label><input class="form-input" id="fL1EditName" data-testid="form-l1-name-input" value="${escHtml(l1.name)}"></div>
      <div class="form-group" style="margin-bottom:0;min-width:120px"><label class="form-label">编码 *</label><input class="form-input" id="fL1EditCode" data-testid="form-l1-code-input" value="${escHtml(l1.code)}"></div>
      <div class="form-group" style="margin-bottom:0;min-width:150px"><label class="form-label">团队</label><select class="form-select" id="fL1EditTeam" data-testid="form-l1-team-select"><option value="">--</option>${teamOpts.map(o => `<option value="${o.id}" ${o.id===l1.teamId?'selected':''}>${escHtml(o.label)}</option>`).join('')}</select></div>
      <div class="form-group" style="margin-bottom:0;min-width:200px"><label class="form-label">负责人</label><div id="fL1EditOwners" data-testid="form-l1-owners-multiselect" style="position:relative"></div></div>
      <div class="inline-form-actions">
        <button class="btn btn-primary btn-sm" data-testid="form-save-btn" onclick="saveEditL1('${l1.id}')">保存</button>
        <button class="btn btn-secondary btn-sm" data-testid="form-cancel-btn" onclick="cancelEditL1()">取消</button>
        <span class="inline-error-text" style="display:none" id="l1EditError"></span>
      </div>
    </div>`;
}

function renderL2CreateForm(l1Id, personMap) {
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  return `
    <div data-testid="l2-inline-create-form" style="display:flex;align-items:flex-end;gap:var(--space-sm);padding:var(--space-xs) 0;flex-wrap:wrap">
      <div class="form-group" style="margin-bottom:0;min-width:120px"><label class="form-label">名称 *</label><input class="form-input" id="fL2CreateName" data-testid="form-l2-name-input"></div>
      <div class="form-group" style="margin-bottom:0;min-width:100px"><label class="form-label">编码 *</label><input class="form-input" id="fL2CreateCode" data-testid="form-l2-code-input"></div>
      <div class="form-group" style="margin-bottom:0;min-width:200px"><label class="form-label">负责人</label><div id="fL2CreateOwners" data-testid="form-l2-owners-multiselect" style="position:relative"></div></div>
      <div class="inline-form-actions">
        <button class="btn btn-primary btn-sm" data-testid="form-save-btn" onclick="saveCreateL2('${l1Id}')">保存</button>
        <button class="btn btn-secondary btn-sm" data-testid="form-cancel-btn" onclick="cancelCreateL2()">取消</button>
        <span class="inline-error-text" style="display:none" id="l2CreateError"></span>
      </div>
    </div>`;
}

function renderL2EditForm(l2, l1Id, personMap) {
  const l1Opts = l1Products.map(x => ({ id: x.id, label: x.name }));
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  return `
    <div data-testid="l2-inline-edit-form" style="display:flex;align-items:flex-end;gap:var(--space-sm);padding:var(--space-xs) 0;flex-wrap:wrap">
      <div class="form-group" style="margin-bottom:0;min-width:120px"><label class="form-label">名称 *</label><input class="form-input" id="fL2EditName" data-testid="form-l2-name-input" value="${escHtml(l2.name)}"></div>
      <div class="form-group" style="margin-bottom:0;min-width:100px"><label class="form-label">编码 *</label><input class="form-input" id="fL2EditCode" data-testid="form-l2-code-input" value="${escHtml(l2.code)}"></div>
      <div class="form-group" style="margin-bottom:0;min-width:200px"><label class="form-label">负责人</label><div id="fL2EditOwners" data-testid="form-l2-owners-multiselect" style="position:relative"></div></div>
      <div class="inline-form-actions">
        <button class="btn btn-primary btn-sm" data-testid="form-save-btn" onclick="saveEditL2('${l2.id}')">保存</button>
        <button class="btn btn-secondary btn-sm" data-testid="form-cancel-btn" onclick="cancelEditL2()">取消</button>
        <span class="inline-error-text" style="display:none" id="l2EditError"></span>
      </div>
    </div>`;
}

// L1 Create
function startCreateL1() {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_create_start', { page: 'products', entity_type: 'l1_product' });
  editingL1 = null; editingL2 = null; creatingL2For = null;
  creatingL1 = true;
  render();
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  window._l1CreateOwners = new MultiSelect(document.getElementById('fL1CreateOwners'), personOpts, []);
  document.getElementById('fL1CreateName')?.focus();
}

async function saveCreateL1() {
  const name = document.getElementById('fL1CreateName').value.trim();
  const code = document.getElementById('fL1CreateCode').value.trim();
  if (!name || !code) {
    document.getElementById('l1CreateError').textContent = '名称和编码不能为空';
    document.getElementById('l1CreateError').style.display = 'block';
    return;
  }

  track('entity_create_submit', { page: 'products', entity_type: 'l1_product' });
  const data = { name, code, teamId: document.getElementById('fL1CreateTeam').value || null, ownerIds: window._l1CreateOwners?.getSelected() || [] };
  const result = await withLock(async () => await api.post('/products/l1', data));

  if (result === null) {
    track('entity_create_fail', { page: 'products', entity_type: 'l1_product', error_code: 'RESOURCE_LOCKED' });
    document.getElementById('l1CreateError').textContent = '系统正在编辑中，请稍后重试';
    document.getElementById('l1CreateError').style.display = 'block';
    return;
  }
  try {
    track('entity_create_success', { page: 'products', entity_type: 'l1_product', entity_id: result.id });
    showToast('L1 产品已创建');
    creatingL1 = false;
    load();
  } catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); }
}

function cancelCreateL1() { creatingL1 = false; render(); }

// L1 Edit
function startEditL1(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_update_start', { page: 'products', entity_type: 'l1_product', entity_id: id });
  creatingL1 = false; editingL2 = null; creatingL2For = null;
  editingL1 = id;
  render();
  const l1 = l1Products.find(x => x.id === id);
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  window._l1EditOwners = new MultiSelect(document.getElementById('fL1EditOwners'), personOpts, l1?.ownerIds || []);
}

async function saveEditL1(id) {
  const name = document.getElementById('fL1EditName').value.trim();
  const code = document.getElementById('fL1EditCode').value.trim();
  if (!name || !code) { document.getElementById('l1EditError').textContent = '名称和编码不能为空'; document.getElementById('l1EditError').style.display = 'block'; return; }

  track('entity_update_submit', { page: 'products', entity_type: 'l1_product', entity_id: id });
  const data = { name, code, teamId: document.getElementById('fL1EditTeam').value || null, ownerIds: window._l1EditOwners?.getSelected() || [] };
  const result = await withLock(async () => await api.put('/products/l1/' + id, data));

  if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); load(); return; }
  try {
    track('entity_update_success', { page: 'products', entity_type: 'l1_product', entity_id: id });
    showToast('L1 产品已更新');
    editingL1 = null;
    load();
  } catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); load(); }
}

function cancelEditL1() { editingL1 = null; render(); }

// L2 Create
function startCreateL2(l1Id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_create_start', { page: 'products', entity_type: 'l2_product' });
  editingL1 = null; editingL2 = null; creatingL1 = false;
  creatingL2For = l1Id;
  render();
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  window._l2CreateOwners = new MultiSelect(document.getElementById('fL2CreateOwners'), personOpts, []);
  document.getElementById('fL2CreateName')?.focus();
}

async function saveCreateL2(l1Id) {
  const name = document.getElementById('fL2CreateName').value.trim();
  const code = document.getElementById('fL2CreateCode').value.trim();
  if (!name || !code) { document.getElementById('l2CreateError').textContent = '名称和编码不能为空'; document.getElementById('l2CreateError').style.display = 'block'; return; }

  track('entity_create_submit', { page: 'products', entity_type: 'l2_product' });
  const data = { l1Id, name, code, ownerIds: window._l2CreateOwners?.getSelected() || [] };
  const result = await withLock(async () => await api.post('/products/l2', data));

  if (result === null) {
    document.getElementById('l2CreateError').textContent = '系统正在编辑中，请稍后重试';
    document.getElementById('l2CreateError').style.display = 'block';
    return;
  }
  try {
    track('entity_create_success', { page: 'products', entity_type: 'l2_product', entity_id: result.id });
    showToast('L2 产品已创建');
    creatingL2For = null;
    load();
  } catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); }
}

function cancelCreateL2() { creatingL2For = null; render(); }

// L2 Edit
function startEditL2(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_update_start', { page: 'products', entity_type: 'l2_product', entity_id: id });
  creatingL1 = false; editingL1 = null; creatingL2For = null;
  editingL2 = id;
  render();
  const l2 = l2Products.find(x => x.id === id);
  const personOpts = people.map(p => ({ id: p.id, label: p.name }));
  window._l2EditOwners = new MultiSelect(document.getElementById('fL2EditOwners'), personOpts, l2?.ownerIds || []);
}

async function saveEditL2(id) {
  const l2 = l2Products.find(x => x.id === id);
  const name = document.getElementById('fL2EditName').value.trim();
  const code = document.getElementById('fL2EditCode').value.trim();
  if (!name || !code) { document.getElementById('l2EditError').textContent = '名称和编码不能为空'; document.getElementById('l2EditError').style.display = 'block'; return; }

  track('entity_update_submit', { page: 'products', entity_type: 'l2_product', entity_id: id });
  const data = { l1Id: l2.l1Id, name, code, ownerIds: window._l2EditOwners?.getSelected() || [] };
  const result = await withLock(async () => await api.put('/products/l2/' + id, data));

  if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); load(); return; }
  try {
    track('entity_update_success', { page: 'products', entity_type: 'l2_product', entity_id: id });
    showToast('L2 产品已更新');
    editingL2 = null;
    load();
  } catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); load(); }
}

function cancelEditL2() { editingL2 = null; render(); }

// Delete
function deleteL1(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_delete_start', { page: 'products', entity_type: 'l1_product', entity_id: id });

  const card = document.querySelector(`[data-testid="products-l1-card-${id}"]`);
  const header = card.querySelector('[data-testid="l1-card-header"]');
  if (!header) { doDeleteL1(id); return; }

  const actionsDiv = header.querySelector('div[style*="flex:1"]');
  const originalHtml = actionsDiv ? actionsDiv.nextElementSibling?.outerHTML || '' : '';

  // Replace edit/delete buttons with confirm
  const buttons = header.querySelectorAll('.l1-edit-btn, .l1-delete-btn');
  buttons.forEach(b => b.style.display = 'none');

  const confirmDiv = document.createElement('div');
  confirmDiv.className = 'inline-confirm-bar';
  confirmDiv.style.cssText = 'display:inline-flex;gap:8px';
  confirmDiv.innerHTML = `
    <button class="btn btn-danger-solid btn-sm" data-testid="row-confirm-delete-btn">确认删除</button>
    <button class="btn btn-secondary btn-sm" data-testid="row-cancel-btn">取消</button>`;
  header.appendChild(confirmDiv);

  confirmDiv.querySelector('.btn-danger-solid').addEventListener('click', () => {
    track('entity_delete_confirm', { page: 'products', entity_type: 'l1_product', entity_id: id });
    doDeleteL1(id).then(() => load());
  });
  confirmDiv.querySelector('.btn-secondary').addEventListener('click', () => {
    track('entity_delete_cancel', { page: 'products', entity_type: 'l1_product', entity_id: id });
    load();
  });
}

async function doDeleteL1(id) {
  const result = await withLock(async () => { await api.delete('/products/l1/' + id); return true; });
  if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  try { track('entity_delete_success', { page: 'products', entity_type: 'l1_product' }); showToast('L1 已删除'); }
  catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); }
}

function deleteL2(id) {
  if (lockDisabled()) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  track('entity_delete_start', { page: 'products', entity_type: 'l2_product', entity_id: id });
  // Simple confirm: use inline confirm on the L2 row
  const row = document.querySelector(`[data-testid="l2-row-${id}"]`);
  if (!row) { doDeleteL2(id); return; }

  row.style.background = 'rgba(198,69,69,0.05)';
  const buttons = row.querySelectorAll('.l2-edit-btn, .l2-delete-btn');
  buttons.forEach(b => b.style.display = 'none');

  const confirmDiv = document.createElement('div');
  confirmDiv.className = 'inline-confirm-bar';
  confirmDiv.innerHTML = `
    <button class="btn btn-danger-solid btn-sm" data-testid="row-confirm-delete-btn">确认删除</button>
    <button class="btn btn-secondary btn-sm" data-testid="row-cancel-btn">取消</button>`;
  row.appendChild(confirmDiv);

  confirmDiv.querySelector('.btn-danger-solid').addEventListener('click', () => {
    track('entity_delete_confirm', { page: 'products', entity_type: 'l2_product', entity_id: id });
    doDeleteL2(id).then(() => load());
  });
  confirmDiv.querySelector('.btn-secondary').addEventListener('click', () => {
    track('entity_delete_cancel', { page: 'products', entity_type: 'l2_product', entity_id: id });
    load();
  });
}

async function doDeleteL2(id) {
  const result = await withLock(async () => { await api.delete('/products/l2/' + id); return true; });
  if (result === null) { showToast('系统正在编辑中，请稍后重试', 'warning'); return; }
  try { track('entity_delete_success', { page: 'products', entity_type: 'l2_product' }); showToast('L2 已删除'); }
  catch (e) { if (e instanceof ApiError) showToast(e.message, 'error'); }
}

function toggleL1(id) {
  if (expandedL1.has(id)) expandedL1.delete(id);
  else { expandedL1.add(id); track('expand_row', { page: 'products', entity_type: 'l1_product', entity_id: id }); }
  render();
}

// data-testid for toolbar
document.getElementById('btnAddL1').setAttribute('data-testid', 'products-add-l1-btn');
document.getElementById('btnAddL1').classList.add('mutating-btn');
document.getElementById('btnAddL2').setAttribute('data-testid', 'l2-add-btn');
document.getElementById('btnAddL2').classList.add('mutating-btn');
document.getElementById('emptyState').setAttribute('data-testid', 'dash-empty-state');

document.getElementById('btnAddL1').onclick = startCreateL1;
document.getElementById('btnAddL2').onclick = () => {
  if (l1Products.length) startCreateL2(l1Products[0].id);
  else showToast('请先创建 L1 产品', 'warning');
};
document.getElementById('sortBy').addEventListener('change', () => { track('list_sort', { page: 'products' }); render(); });

load();
