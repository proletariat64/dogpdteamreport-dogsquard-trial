/* ── Lightweight Observer Pattern State ── */
const AppState = {
  lock: { locked: false, holderIp: null, isOwn: false },
  analyticsQueue: [],
  listeners: new Map(),

  subscribe(key, fn) {
    if (!this.listeners.has(key)) this.listeners.set(key, []);
    this.listeners.get(key).push(fn);
  },

  notify(key) {
    const fns = this.listeners.get(key);
    if (fns) fns.forEach(fn => fn(this[key]));
  },

  setLock(lockData) {
    const prev = this.lock;
    this.lock = {
      locked: lockData.locked,
      holderIp: lockData.holderIp || null,
      isOwn: lockData.isOwn || false,
      acquiredAt: lockData.acquiredAt || null,
    };
    this.notify('lock');

    if (prev.locked !== this.lock.locked || prev.holderIp !== this.lock.holderIp) {
      if (typeof track !== 'undefined') {
        track(this.lock.locked ? (this.lock.isOwn ? 'lock_acquired' : 'lock_denied') : 'lock_released', {
          holder_ip: this.lock.holderIp,
        });
      }
    }
  },

  enqueueAnalytics(event, properties) {
    this.analyticsQueue.push({ event, properties, timestamp: Date.now() });
  },
};

// Poll lock status with recursive setTimeout and max retry backoff
(function startLockPoll() {
  let consecutiveErrors = 0;
  const MAX_INTERVAL = 300000; // 5 minutes cap

  async function tick() {
    try {
      if (typeof api === 'undefined') { schedule(); return; } // ai-review: intentional — api.js loads before state.js in HTML
      const status = await api.get('/admin/status');
      consecutiveErrors = 0;
      if (status && status.lock) {
        AppState.setLock(status.lock);
      }
    } catch {
      consecutiveErrors++;
      // Back off on repeated errors, but never stop polling entirely
    }
    schedule();
  }

  function schedule() {
    const delay = Math.min(30000 * Math.pow(2, Math.min(consecutiveErrors, 5)), MAX_INTERVAL);
    setTimeout(tick, delay);
  }

  schedule();
})();

window.AppState = AppState;
