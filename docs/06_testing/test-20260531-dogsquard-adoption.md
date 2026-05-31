---
title: "Dogsquard Adoption Test Plan"
doc_type: "test"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-31"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# Objective

Validate that the `dogpdteamreport` trial repository can adopt Dogsquard governance while preserving the Node/Express app and passing local quality checks.

# Validation Commands

```bash
npm ci
npm test
npm run build
make help
make doc-check
make doc-guard
make test
make lint
make release-check
git diff --check
bash -n scripts/*.sh
```

# Trial Findings

- The source app needs a committed `data/.gitkeep` so runtime lock and database files can be created without committing runtime data.
- The SSH-based UAT file under `test/e2e/` targets the old `ifundaitest` host and is excluded from default Vitest runs.
- A small number of test assertions expected historical bug behavior; they were aligned with current app behavior.
- Dogsquard example app and dev deploy assets were not copied.

# Acceptance Criteria

- Node tests pass.
- TypeScript build passes.
- Dogsquard documentation checks pass.
- PR Quality Gate is Node-specific.
- No secrets, runtime data, `node_modules`, or `dist` artifacts are committed.
