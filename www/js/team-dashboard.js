buildNavBar('team-dash');
track('page_view', { page: 'team-dashboard' });

let teams = [], people = [], l1Products = [], l2Products = [], l0Goals = [], l1Goals = [], l2Goals = [];
let expandedTeams = new Set();

async function load() {
  try {
    [teams, people, l1Products, l2Products, l0Goals, l1Goals, l2Goals] = await Promise.all([
      api.get('/teams'), api.get('/people'), api.get('/products/l1'), api.get('/products/l2'),
      api.get('/goals/l0'), api.get('/goals/l1'), api.get('/goals/l2'),
    ]);

    const teamFilter = document.getElementById('filterTeam').value;
    const locationFilter = document.getElementById('filterLocation').value;

    if (teamFilter) teams = teams.filter(t => t.id === teamFilter);
    if (locationFilter) people = people.filter(p => p.location === locationFilter);

    render();
  } catch (e) { showToast('加载失败: ' + e.message, 'error'); }
}

async function loadFilters() {
  try {
    const [allTeams, allPeople] = await Promise.all([api.get('/teams'), api.get('/people')]);
    const tSel = document.getElementById('filterTeam');
    tSel.innerHTML = '<option value="">全部团队</option>' + allTeams.map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('');
    const locs = [...new Set(allPeople.map(p => p.location).filter(Boolean))];
    const lSel = document.getElementById('filterLocation');
    lSel.innerHTML = '<option value="">全部地点</option>' + locs.map(l => `<option value="${escHtml(l)}">${escHtml(l)}</option>`).join('');
  } catch (e) { /* ignore */ }
}

function render() {
  const container = document.getElementById('teamCards');
  const empty = document.getElementById('emptyState');
  const l1Map = Object.fromEntries(l1Products.map(p => [p.id, p.name]));
  const l2IdMap = Object.fromEntries(l2Products.map(p => [p.id, p]));

  // Compute metrics
  const teamPeople = teams.map(t => ({
    team: t,
    members: people.filter(p => p.teamId === t.id),
  }));

  const totalPeople = people.length;
  const unassignedPeople = new Set([
    ...people.filter(p => !p.teamId || !teams.find(t => t.id === p.teamId)).map(p => p.id),
    ...people.filter(p => {
      if (!p.teamId) return false;
      const hasProduct = (p.l1ProductIds || []).length > 0 || (p.l2ProductIds || []).length > 0;
      return !hasProduct;
    }).map(p => p.id),
  ]).size;

  document.getElementById('metricTeams').textContent = teams.length;
  document.getElementById('metricPeople').textContent = totalPeople;
  document.getElementById('metricUnassigned').textContent = unassignedPeople;

  if (!teams.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  container.innerHTML = teamPeople.map(({ team, members }) => {
    const isOpen = expandedTeams.has(team.id);
    const l1s = l1Products.filter(l1 => l1.teamId === team.id);
    const l1Ids = l1s.map(l1 => l1.id);
    const l2s = l2Products.filter(l2 => l1Ids.includes(l2.l1Id));
    const goalCount = l1Goals.filter(g => l1Ids.includes(g.l1ProductId)).length
      + l2Goals.filter(g => l2s.find(l2 => l2.id === g.l2ProductId)).length;

    return `
    <div class="card team-card" data-testid="team-dash-card-${team.id}">
      <div class="team-card__header" style="cursor:pointer" onclick="toggleTeam('${team.id}')">
        <span class="expand-icon ${isOpen ? 'open' : ''}" data-testid="team-card-expand-btn">▸</span>
        <span class="team-card__title">${escHtml(team.name)}</span>
        <div class="team-card__meta">
          <span>人员: ${members.length}</span>
          <span>产品: ${l1s.length}</span>
          <span>目标: ${goalCount}</span>
        </div>
      </div>
      ${isOpen ? `
      <div class="team-card__body">
        ${members.length ? members.map(p => {
          const hasProduct = (p.l1ProductIds || []).length > 0 || (p.l2ProductIds || []).length > 0;
          return `
          <div class="team-card__person-row" data-testid="team-card-person-row-${p.id}">
            <span class="team-card__person-name">${escHtml(p.name)}</span>
            ${p.level ? `<span class="badge badge-default">L${escHtml(p.level)}</span>` : ''}
            ${hasProduct ? `
              ${(p.l1ProductIds || []).map(id => `<span class="badge badge-coral">${escHtml(l1Map[id] || id)}</span>`).join('')}
              ${(p.l2ProductIds || []).map(id => {
                const l2 = l2IdMap[id];
                return l2 ? `<span class="badge badge-amber">${escHtml(l2.name)}</span>` : '';
              }).join('')}
            ` : `<span class="team-card__unassigned" data-testid="team-card-unassigned-warning">未分配产品</span>`}
          </div>`;
        }).join('') : '<p style="color:var(--muted)">暂无成员</p>'}
      </div>` : ''}
    </div>`;
  }).join('');
}

function toggleTeam(id) {
  if (expandedTeams.has(id)) { expandedTeams.delete(id); track('collapse_row', { page: 'team-dashboard', entity_type: 'team', entity_id: id }); }
  else { expandedTeams.add(id); track('expand_row', { page: 'team-dashboard', entity_type: 'team', entity_id: id }); }
  render();
}

document.getElementById('filterTeam').addEventListener('change', () => { track('list_filter', { page: 'team-dashboard', filter_key: 'team' }); load(); });
document.getElementById('filterLocation').addEventListener('change', () => { track('list_filter', { page: 'team-dashboard', filter_key: 'location' }); load(); });
document.getElementById('btnRefresh').addEventListener('click', () => { track('refresh', { page: 'team-dashboard' }); load(); });
document.getElementById('btnRefresh').setAttribute('data-testid', 'team-dash-refresh-btn');

(async () => { await loadFilters(); load(); })();
