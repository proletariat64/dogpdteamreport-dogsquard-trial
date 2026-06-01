---
title: "PR Quality Gate Test Plan"
doc_type: "test"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-30"
updated: "2026-05-30"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# PR Quality Gate Test Plan

## Objective

Define the validation scope for the Dogsquard PR Quality Gate.

The gate should provide deterministic checks for repository work without adding deployment, production release, self-hosted runners, database, auth, or full Playwright regression.

## Checks Included

The current workflow includes:

- shell syntax validation for `scripts/*.sh`
- repository hygiene through `git diff --check`
- local foundation commands through `make help`, `make doc-check`, `make doc-guard`, and `make release-check`
- minimal Playwright smoke through `make e2e-smoke`
- temporary scope guard for forbidden out-of-phase paths
- final `PR Quality Summary` job that fails when a required job fails or is cancelled

## Required For PR Merge

The recommended required status check is:

```text
PR Quality Summary
```

The individual jobs are required through the summary job dependency chain.

## Checks Excluded From The Current Gate

The current gate does not include:

- full Playwright regression
- deployment
- production release
- self-hosted runner
- database integration
- authentication checks
- external SaaS integrations
- external LLM commands

Backend tests and frontend build run through local commands now that those project areas exist.

## Local Validation

Run these commands before opening or updating a PR:

```bash
make doc-check
make doc-guard
make release-check
git diff --check
bash -n scripts/*.sh
make e2e-smoke
```

Expected local result:

- documentation checks pass
- shell scripts parse
- whitespace check passes
- backend tests pass
- frontend build passes
- minimal Playwright smoke passes

## PR Validation

Open a pull request targeting `main`.

GitHub Actions should run `PR Quality Gate` and report:

- `Shell Check`
- `Repository Hygiene`
- `Local Foundation`
- `Playwright Smoke`
- `Temporary Scope Guard`
- `PR Quality Summary`

The `PR Quality Summary` job should be the required status check after branch protection is manually configured.

## Known Limitations

- The scope guard is temporary and now allows backend/frontend changes and minimal Playwright smoke files.
- The workflow runs minimal Playwright smoke only, not full regression.
- The workflow does not deploy.
- The workflow does not validate label sync automation.
- The workflow does not replace human review of product meaning.
- Branch protection remains a manual repository setting in Phase 5E.

## Future Expansion Plan

Later phases may add:

- full Playwright regression
- documentation gate refinements
- branch protection requiring `PR Quality Summary`
- deployment workflows for dev and production
- production approval gates
