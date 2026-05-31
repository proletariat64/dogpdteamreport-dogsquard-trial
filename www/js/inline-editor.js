/* ── Inline Editor Components ── */

/**
 * InlineEditor - converts a table row into an editable form row.
 * Usage: new InlineEditor(rowEl, { fields: [...], onSave: fn, onCancel: fn })
 *
 * Each field: { name, label, type: 'text'|'select'|'multiselect', value, options: [...], required }
 */
class InlineEditor {
  constructor(row, options) {
    this.row = row;
    this.options = options;
    this.state = 'editing'; // editing | saving | error
    this.originalHtml = row.innerHTML;
    this._listeners = [];
    this.render();
  }

  _on(el, evt, fn) {
    el.addEventListener(evt, fn);
    this._listeners.push({ el, evt, fn });
  }

  _off() {
    this._listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
    this._listeners = [];
  }

  render() {
    const { fields } = this.options;
    const cells = this.row.querySelectorAll('td');
    const lastCell = cells[cells.length - 1];

    // Replace each data cell with form control (skip last cell = actions)
    fields.forEach((field, i) => {
      if (i >= cells.length - 1) return;
      const cell = cells[i];
      cell.innerHTML = this._renderField(field);
    });

    // Replace actions cell with save/cancel buttons
    lastCell.innerHTML = `
      <div class="inline-form-actions">
        <button class="btn btn-primary btn-sm form-save-btn" data-testid="form-save-btn" ${this.state === 'saving' ? 'disabled' : ''}>${this.state === 'saving' ? '保存中...' : '保存'}</button>
        <button class="btn btn-secondary btn-sm form-cancel-btn" data-testid="form-cancel-btn">取消</button>
        <span class="inline-error-text" data-testid="inline-error-text" style="display:none"></span>
      </div>`;

    this.row.classList.add('row--editing');

    // Bind events
    const saveBtn = lastCell.querySelector('.form-save-btn');
    const cancelBtn = lastCell.querySelector('.form-cancel-btn');

    this._on(saveBtn, 'click', () => this._handleSave());
    this._on(cancelBtn, 'click', () => this._handleCancel());

    // Keyboard shortcuts
    const firstInput = this.row.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();

    const keyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this._handleCancel(); }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); this._handleSave(); }
    };
    this._on(this.row, 'keydown', keyHandler);
  }

  _renderField(field) {
    const value = escHtml(String(field.value ?? ''));
    switch (field.type) {
      case 'select': {
        const opts = (field.options || []).map(o =>
          `<option value="${escHtml(String(o.id))}" ${o.id === field.value ? 'selected' : ''}>${escHtml(o.label)}</option>`
        ).join('');
        return `<div class="form-label">${escHtml(field.label)}</div>
          <select class="form-select" name="${field.name}" data-testid="form-${field.name}-select" ${field.required ? 'required' : ''}>
            <option value="">-- 请选择 --</option>${opts}
          </select>`;
      }
      case 'multiselect':
        // ai-review: intentional — container only; page script initializes MultiSelect after render
        return `<div class="form-label">${escHtml(field.label)}</div>
          <div class="multiselect-container" data-field="${field.name}" data-testid="form-${field.name}-multiselect"></div>`;
      default:
        return `<div class="form-label">${escHtml(field.label)}</div>
          <input class="form-input" name="${field.name}" value="${value}" data-testid="form-${field.name}-input" ${field.required ? 'required' : ''}>`;
    }
  }

  getFormData() {
    const data = {};
    this.options.fields.forEach(field => {
      if (field.type === 'multiselect') {
        data[field.name] = field._ms ? field._ms.getSelected() : [];
      } else {
        const el = this.row.querySelector(`[name="${field.name}"]`);
        if (el) data[field.name] = el.value;
      }
    });
    return data;
  }

  setSaving() {
    this.state = 'saving';
    const saveBtn = this.row.querySelector('.form-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }
  }

  setError(msg) {
    this.state = 'error';
    const saveBtn = this.row.querySelector('.form-save-btn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; }
    const errorEl = this.row.querySelector('.inline-error-text');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    this.row.querySelectorAll('.form-input').forEach(el => el.classList.add('error'));
  }

  async _handleSave() {
    if (this.options.onSave) await this.options.onSave(this.getFormData());
  }

  _handleCancel() {
    this.row.classList.remove('row--editing');
    this.row.innerHTML = this.originalHtml;
    this.options.onCancel?.();
  }

  destroy() {
    this._off();
    this.row.classList.remove('row--editing');
    this.row.innerHTML = this.originalHtml;
  }
}

/**
 * InlineCreateRow - inserts a form row at the top of a table body for creating new entities.
 * Usage: new InlineCreateRow(tbodyEl, { fields: [...], onSave: fn, onCancel: fn })
 */
class InlineCreateRow {
  constructor(tbody, options) {
    this.tbody = tbody;
    this.options = options;
    this.state = 'idle'; // idle | saving
    this.row = null;
    this._listeners = [];
    this.render();
  }

  _on(el, evt, fn) {
    el.addEventListener(evt, fn);
    this._listeners.push({ el, evt, fn });
  }

  _off() {
    this._listeners.forEach(({ el, evt, fn }) => el.removeEventListener(evt, fn));
    this._listeners = [];
  }

  render() {
    const { fields } = this.options;
    const useColspan = this.options.useColspan;
    const colspanCount = this.options.colspanCount || (this.tbody.closest('table')?.querySelectorAll('thead th').length || fields.length + 1);

    this.row = document.createElement('tr');
    this.row.className = 'inline-form-row';
    this.row.setAttribute('data-testid', 'inline-create-form');

    if (useColspan) {
      // Full-width form spanning all columns
      const formFieldsHtml = fields.map(field =>
        `<div class="form-group" style="display:inline-block;margin-right:var(--space-md);vertical-align:top;min-width:160px">
          ${this._renderField(field)}
        </div>`
      ).join('');

      this.row.innerHTML = `
        <td colspan="${colspanCount}" style="padding:var(--space-md)">
          <div class="inline-form" style="flex-wrap:wrap;align-items:flex-start">
            ${formFieldsHtml}
            <div class="inline-form-actions" style="margin-top:var(--space-md)">
              <button class="btn btn-primary btn-sm form-save-btn" data-testid="form-save-btn">保存</button>
              <button class="btn btn-secondary btn-sm form-cancel-btn" data-testid="form-cancel-btn">取消</button>
              <span class="inline-error-text" data-testid="inline-error-text" style="display:none"></span>
            </div>
          </div>
        </td>`;
    } else {
      const cellsHtml = fields.map(field =>
        `<td>${this._renderField(field)}</td>`
      ).join('');

      this.row.innerHTML = cellsHtml + `
        <td class="actions">
          <div class="inline-form-actions">
            <button class="btn btn-primary btn-sm form-save-btn" data-testid="form-save-btn">保存</button>
            <button class="btn btn-secondary btn-sm form-cancel-btn" data-testid="form-cancel-btn">取消</button>
            <span class="inline-error-text" data-testid="inline-error-text" style="display:none"></span>
          </div>
        </td>`;
    }

    this.tbody.insertBefore(this.row, this.tbody.firstChild);

    const saveBtn = this.row.querySelector('.form-save-btn');
    const cancelBtn = this.row.querySelector('.form-cancel-btn');

    this._on(saveBtn, 'click', () => this._handleSave());
    this._on(cancelBtn, 'click', () => this._handleCancel());

    const firstInput = this.row.querySelector('input, select, textarea');
    if (firstInput) firstInput.focus();

    const keyHandler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); this._handleCancel(); }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); this._handleSave(); }
    };
    this._on(this.row, 'keydown', keyHandler);
  }

  _renderField(field) {
    switch (field.type) {
      case 'select': {
        const opts = (field.options || []).map(o =>
          `<option value="${escHtml(String(o.id))}">${escHtml(o.label)}</option>`
        ).join('');
        return `<div class="form-label">${escHtml(field.label)}</div>
          <select class="form-select" name="${field.name}" data-testid="form-${field.name}-select" ${field.required ? 'required' : ''}>
            <option value="">-- 请选择 --</option>${opts}
          </select>`;
      }
      case 'multiselect':
        // ai-review: intentional — container only; page script initializes MultiSelect after render
        return `<div class="form-label">${escHtml(field.label)}</div>
          <div class="multiselect-container" data-field="${field.name}" data-testid="form-${field.name}-multiselect"></div>`;
      default:
        return `<div class="form-label">${escHtml(field.label)}</div>
          <input class="form-input" name="${field.name}" placeholder="${escHtml(field.placeholder || '')}" data-testid="form-${field.name}-input" ${field.required ? 'required' : ''}>`;
    }
  }

  getFormData() {
    const data = {};
    this.options.fields.forEach(field => {
      if (field.type === 'multiselect') {
        data[field.name] = field._ms ? field._ms.getSelected() : [];
      } else {
        const el = this.row.querySelector(`[name="${field.name}"]`);
        if (el) data[field.name] = el.value;
      }
    });
    return data;
  }

  setSaving() {
    this.state = 'saving';
    const saveBtn = this.row.querySelector('.form-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '保存中...'; }
  }

  setError(msg) {
    this.state = 'error';
    const saveBtn = this.row.querySelector('.form-save-btn');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '保存'; }
    const errorEl = this.row.querySelector('.inline-error-text');
    if (errorEl) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
    this.row.querySelectorAll('.form-input').forEach(el => el.classList.add('error'));
  }

  async _handleSave() {
    if (this.options.onSave) await this.options.onSave(this.getFormData());
  }

  _handleCancel() {
    this.destroy();
    this.options.onCancel?.();
  }

  destroy() {
    this._off();
    if (this.row) { this.row.remove(); this.row = null; }
  }
}

window.InlineEditor = InlineEditor;
window.InlineCreateRow = InlineCreateRow;
