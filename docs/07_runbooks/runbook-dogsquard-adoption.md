---
title: "Dogsquard Adoption Runbook"
doc_type: "runbook"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-31"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# Purpose

Describe how Dogsquard governance was applied to the `dogpdteamreport` trial repository.

# Adoption Scope

- Preserve the imported Node/Express app.
- Add Dogsquard docs governance.
- Add GitHub issue and PR templates.
- Add Node-adapted PR Quality Gate.
- Add Makefile commands for local validation.

# Out of Scope

- Deployment.
- Production release.
- Server changes.
- Dogsquard example app.
- Dogsquard dev deploy workflow.
- Changes to the original `dogpdteamreport` repository.

# Local Validation

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

# Existing Project Docs

Keep `ddd/` and `spec/` as project-specific docs. Use `docs/` for Dogsquard-governed planning, runbooks, ADRs, and test plans.

# Trial Notes

- `test/e2e/` contains an old SSH-based UAT check and is not part of the default `npm test` gate.
- `data/.gitkeep` is committed only to preserve the runtime directory; database, lock, and backup files remain ignored.
- The first adoption PR intentionally avoids deployment, public access, and Dogsquard dev deploy assets.

# Next Work

After the governance PR, use one focused PR for a real bug fix, then one focused PR for a small feature. Do not create command-sized micro PRs.
