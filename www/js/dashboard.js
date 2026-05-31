buildNavBar('dashboard');
track('page_view', { page: 'dashboard' });

let data = [];
let expandedL1 = new Set();
let expandedL2 = new Set();

async function load() {
  try {
    const teamId = document.getElementById('filterTeam').value;
    const location = document.getElementById('filterLocation').value;
    const params = new URLSearchParams();
    if (teamId) params.set('teamId', teamId);
    if (location) params.set('location', location);

    const qs = params.toString();
    data = await api.get('/dashboard' + (qs ? '?' + qs : ''));
    render();
  } catch (e) {
    showToast('加载 Dashboard 失败: ' + e.message, 'error');
  }
}

async function loadFilters() {
  try {
    const [teams, people] = await Promise.all([
      api.get('/teams'), api.get('/people'),
    ]);
    const teamSel = document.getElementById('filterTeam');
    teamSel.innerHTML = '<option value="">全部团队</option>' + teams.map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('');
    const locations = [...new Set(people.map(p => p.location).filter(Boolean))];
    const locSel = document.getElementById('filterLocation');
    locSel.innerHTML = '<option value="">全部地点</option>' + locations.map(l => `<option value="${escHtml(l)}">${escHtml(l)}</option>`).join('');
  } catch (e) { /* filters unavailable */ }
}

function coverageClass(pct) {
  if (pct >= 80) return 'good';
  if (pct >= 50) return 'warn';
  return 'bad';
}

function render() {
  const container = document.getElementById('dashboardContent');
  const empty = document.getElementById('emptyState');

  if (!data.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = data.map(l1 => {
    const m = l1.metrics;
    const l1Key = l1.l1Product.id;
    const isL1Open = expandedL1.has(l1Key);

    return `
    <div class="card l1-card" data-testid="dash-l1-card-${l1Key}" data-l1-key="${escHtml(l1Key)}">
      <div class="l1-header" data-action="toggle-l1">
        <span class="expand-icon ${isL1Open ? 'open' : ''}" data-testid="dash-l1-expand-btn">▸</span>
        <span class="l1-name">${escHtml(l1.l1Product.name)}</span>
        <span class="l1-code">${escHtml(l1.l1Product.code)}</span>
        ${l1.l1Product.team ? `<span class="badge badge-default">${escHtml(l1.l1Product.team.name)}</span>` : ''}
        <div style="flex:1"></div>
        <div class="metrics-row" style="margin:0;gap:var(--space-lg)">
          <div class="metric-item"><div class="metric-value" data-testid="dash-metric-l2-count">${m.l2Count}</div><div class="metric-label">L2 产品</div></div>
          <div class="metric-item"><div class="metric-value" data-testid="dash-metric-people-count">${m.peopleCount}</div><div class="metric-label">人员</div></div>
          <div class="metric-item"><div class="metric-value" data-testid="dash-metric-goal-count">${m.l1GoalCount + m.l2GoalCount}</div><div class="metric-label">目标</div></div>
          <div class="metric-item" style="min-width:140px">
            <div style="display:flex;justify-content:space-between"><span class="metric-value" style="font-size:22px" data-testid="dash-metric-coverage">${m.coveragePercent}%</span></div>
            <div class="metric-label">覆盖率</div>
            <div class="progress-bar" data-testid="dash-coverage-bar"><div class="progress-fill ${coverageClass(m.coveragePercent)}" style="width:${m.coveragePercent}%"></div></div>
          </div>
        </div>
        <a href="/products.html?focus=${encodeURIComponent(l1Key)}" class="btn btn-text btn-sm" style="color:var(--primary)" data-action="drill-down" data-testid="dash-l1-detail-link">查看详情</a>
      </div>
      ${isL1Open ? renderL1Detail(l1, l1Key) : ''}
    </div>`;
  }).join('');
}

function renderL1Detail(l1, l1Key) {
  return `
  <div class="l1-detail" data-testid="dash-l1-detail-panel">
    ${l1.l1Goals.length ? `
    <div style="margin-bottom:var(--space-md)">
      <h4 style="font-size:14px;color:var(--muted);margin-bottom:var(--space-sm)">L1 目标</h4>
      <div class="badge-row">${l1.l1Goals.map(g => `<span class="badge badge-coral" title="${escHtml(g.standard || '')}">${escHtml(g.content)}</span>`).join('')}</div>
    </div>` : ''}
    ${l1.l2Nodes.length ? `
    <div class="l2-list">
      ${l1.l2Nodes.map(l2 => {
        const l2Key = `${l1Key}-${l2.l2Product.id}`;
        const isL2Open = expandedL2.has(l2Key);
        return `
        <div class="l2-item">
          <div style="display:flex;align-items:center;gap:var(--space-sm);cursor:pointer;padding:var(--space-sm) 0" data-action="toggle-l2" data-l2-key="${escHtml(l2Key)}">
            <span class="expand-icon ${isL2Open ? 'open' : ''}" data-testid="dash-l2-expand-btn">▸</span>
            <strong style="color:var(--ink)">${escHtml(l2.l2Product.name)}</strong>
            <span class="code">${escHtml(l2.l2Product.code)}</span>
            <span class="badge badge-default">${l2.people.length} 人</span>
            <span class="badge badge-default">${l2.l2Goals.length} 目标</span>
          </div>
          ${isL2Open ? `
          <div class="l2-detail" style="margin-left:var(--space-lg);padding:var(--space-sm) 0" data-testid="dash-l2-detail-panel">
            ${l2.people.length ? `<div style="margin-bottom:var(--space-xs)"><span style="font-size:12px;color:var(--muted)">人员：</span>${l2.people.map(p => `<span class="badge badge-default" style="margin:2px">${escHtml(p.name)} ${p.level ? 'L'+escHtml(p.level) : ''}</span>`).join(' ')}</div>` : ''}
            ${l2.l2Goals.length ? `<div><span style="font-size:12px;color:var(--muted)">目标：</span>${l2.l2Goals.map(g => `<span class="badge badge-amber" style="margin:2px" title="${escHtml(g.standard || '')}">${escHtml(g.content)}</span>`).join(' ')}</div>` : ''}
          </div>` : ''}
        </div>`;
      }).join('')}
    </div>` : '<p class="text-muted" style="margin-top:var(--space-md)">暂无 L2 产品</p>'}
    ${l1.unassignedPeople.length ? `
    <div style="margin-top:var(--space-md);padding-top:var(--space-md);border-top:1px solid var(--hairline)">
      <span style="font-size:12px;color:var(--muted)">未分配人员：</span>
      ${l1.unassignedPeople.map(p => `<span class="badge badge-default" style="margin:2px;opacity:0.7">${escHtml(p.name)}</span>`).join(' ')}
    </div>` : ''}
  </div>`;
}

function toggleL1(key) {
  if (expandedL1.has(key)) { expandedL1.delete(key); track('collapse_row', { page: 'dashboard', entity_type: 'l1_product', entity_id: key }); }
  else { expandedL1.add(key); track('expand_row', { page: 'dashboard', entity_type: 'l1_product', entity_id: key }); }
  render();
}

function toggleL2(key) {
  if (expandedL2.has(key)) expandedL2.delete(key);
  else expandedL2.add(key);
  render();
}

// Event delegation for L1/L2 toggles and drill-down links (avoids inline onclick XSS)
document.getElementById('dashboardContent').addEventListener('click', (e) => {
  const l1Header = e.target.closest('[data-action="toggle-l1"]');
  if (l1Header) {
    const card = l1Header.closest('.l1-card');
    if (card) { toggleL1(card.dataset.l1Key); }
    return;
  }

  const l2Toggle = e.target.closest('[data-action="toggle-l2"]');
  if (l2Toggle) {
    const l2Key = l2Toggle.dataset.l2Key;
    if (l2Key) { toggleL2(l2Key); }
    return;
  }

  const drillLink = e.target.closest('[data-action="drill-down"]');
  if (drillLink) {
    e.stopPropagation();
    const l1Key = drillLink.closest('.l1-card')?.dataset.l1Key;
    if (l1Key) {
      track('dashboard_drill_down', { from_page: 'dashboard', to_page: 'products', entity_type: 'l1_product', entity_id: l1Key });
    }
  }
});

document.getElementById('filterTeam').addEventListener('change', () => { track('list_filter', { page: 'dashboard', filter_key: 'team' }); load(); });
document.getElementById('filterLocation').addEventListener('change', () => { track('list_filter', { page: 'dashboard', filter_key: 'location' }); load(); });
document.getElementById('btnRefresh').addEventListener('click', load);

document.getElementById('filterTeam').setAttribute('data-testid', 'dash-filter-team-select');
document.getElementById('filterLocation').setAttribute('data-testid', 'dash-filter-location-select');
document.getElementById('btnRefresh').setAttribute('data-testid', 'dash-refresh-btn');
document.getElementById('emptyState').setAttribute('data-testid', 'dash-empty-state');

(async () => { await loadFilters(); load(); })();
