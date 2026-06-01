---
title: "AI Code Review Context"
doc_type: "design"
status: "draft"
owner: "user"
source: "user"
created: "2026-05-28"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# AI Code Review Context

This file provides architectural context to the AI review bot so it doesn't flag intentional design patterns as bugs.

## Frontend Architecture

- **Zero build step, zero framework.** Pure HTML/CSS/JS in `www/`.
- **No bundler.** Files are loaded via `<script>` tags in a strict order (see below).
- **No modals.** All CRUD uses inline editing.

### Script Loading Order (all pages)

Scripts load synchronously in this exact order:

1. `api.js` — fetch wrapper; defines `api`, `ApiError`, `LockedError`
2. `state.js` — observer pattern `AppState`; polls `/admin/status` every 30s; **guaranteed `api` is loaded**
3. `analytics.js` — `track()` pushes to `AppState.analyticsQueue`; flushes on `beforeunload`
4. `components.js` — `showToast`, `withLock`, `lockDisabled`, `getLockHolder`, `createInlineConfirm`, `buildNavBar`, `updateLockStatus`, `MultiSelect`, `escHtml`, `updateMutatingButtons`
5. `inline-editor.js` — `InlineEditor` and `InlineCreateRow` classes
6. `page.js` — page-specific logic (e.g. `people.js`, `products.js`)

**Consequence:** `api`, `AppState`, `track`, `escHtml`, `updateMutatingButtons`, `InlineCreateRow`, `MultiSelect` are all guaranteed defined when page scripts run.

### Inline Editor Pattern

`InlineEditor` and `InlineCreateRow` render form DOM (including `<div class="multiselect-container">` placeholders). **They do NOT initialize `MultiSelect`.**

Page scripts initialize `MultiSelect` separately after creating the editor:

```js
inlineCreate = new InlineCreateRow(tbody, { fields: [...] });
const container = inlineCreate.row.querySelector('[data-field="tagIds"]');
const ms = new MultiSelect(container, options, selected);
```

This is **intentional** — the editor is generic; the page knows which fields need MultiSelect.

### Analytics

`analytics.js` flush on `beforeunload` is **best-effort by design**. `sendBeacon` + `fetch(keepalive)` are used; if both fail, data loss on page close is acceptable. The backend `/api/analytics` is a no-op 204 endpoint.

### Lock Polling

`state.js` polls `/admin/status` with recursive `setTimeout` + exponential backoff. The first tick is delayed; `api.js` is always loaded before `state.js` executes.

## Backend Architecture

- **Express + sql.js (WASM SQLite).** In-memory DB persisted to `data/app.db`.
- **No ORM, no migrations.** Schema is `ddd/schema.sql` executed on every startup.
- **Entity IDs:** `${prefix}-${uuid(8)}` (e.g. `p-a1b2c3d4`).
- **Edit lock:** Global in-memory lock with 30-min expiry; returns HTTP 423 on conflict.
- **Error hierarchy:** `AppError` → `ValidationError`, `NotFoundError`, `ConflictError`, `LockedError`.

## Common False Positions to Ignore

| Pattern | Why it's correct |
|---|---|
| `const status = await api.get('/admin/status')` in `state.js` | `api` is guaranteed loaded by HTML script order |
| `InlineEditor._renderField` returns `<div class="multiselect-container">` | MultiSelect is initialized by page script after render |
| `if (result === null) { ... return; }` before `result.id` | Early return prevents accessing `result.id` on null |
| `managerOpts = people.map(...)` in `startCreate()` | Create mode has no "self" to filter; `editPerson` filters `x.id !== id` |
| `AppState.analyticsQueue = []` after `sendBeacon` | Best-effort by design; no guarantee on `beforeunload` |
| `!important` in CSS | Used sparingly for inline editing states that must override |
