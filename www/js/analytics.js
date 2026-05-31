/* ── Analytics Tracking ── */
function track(event, properties = {}) {
  if (typeof AppState !== 'undefined' && AppState.enqueueAnalytics) {
    AppState.enqueueAnalytics(event, properties);
  }
}

// Flush analytics queue on page unload via sendBeacon + fetch fallback
window.addEventListener('beforeunload', () => {
  if (typeof AppState !== 'undefined' && AppState.analyticsQueue && AppState.analyticsQueue.length) {
    const payload = JSON.stringify(AppState.analyticsQueue);
    const blob = new Blob([payload], { type: 'application/json' });
    let sent = false;
    if (navigator.sendBeacon) {
      sent = navigator.sendBeacon('/api/analytics', blob);
    }
    if (!sent && typeof fetch !== 'undefined') {
      try {
        fetch('/api/analytics', { method: 'POST', body: blob, keepalive: true });
      } catch {
        // Silently fail — analytics are best-effort
      }
    }
    // ai-review: intentional — best-effort flush; data loss on failure is acceptable by design
    AppState.analyticsQueue = [];
  }
});

window.track = track;
