---
title: "Template Finalization Test Plan"
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

# Template Finalization Test Plan

## Objective

Define how to validate Dogsquard template finalization and new-repo bootstrap implementation.

This test plan supports 6E-B implementation.

## Test Strategy

The bootstrap should be tested against temporary local target directories so Dogsquard can prove it initializes a usable project without relying on current repo state.

Validation should cover:

- generated file layout
- placeholder replacement
- documentation governance
- local commands
- GitHub templates
- PR Quality Gate behavior
- example app inclusion or exclusion
- no secrets copied

## Fresh Repo Bootstrap Test

Test flow:

1. Create a temporary empty directory.
2. Run the Dogsquard bootstrap/init process.
3. Inspect generated files.
4. Confirm excluded files are not copied.
5. Confirm optional files are copied only when requested.
6. Confirm the generated repo has enough docs to open a first Control Board and first design issue.

Expected:

- core template files exist
- project-specific placeholders are replaced or clearly marked for review
- no private Dogsquard local state is copied

## 6E-B Implementation Validation

Dry-run validation:

```bash
tmp_target="$(mktemp -d)"
scripts/init-new-repo.sh "$tmp_target"
```

Expected:

- planned actions are printed
- no files are written to the target
- default excludes example app and dev deploy assets

Actual init validation:

```bash
DRY_RUN=false scripts/init-new-repo.sh "$tmp_target"
find "$tmp_target" -maxdepth 3 -type f | sort | head -200
```

Expected:

- core docs, scripts, Makefile, `.github` templates, README starter, changelog starter, and `.env.example` are present
- `backend/` and `frontend/` are not copied by default
- `.git/`, `node_modules/`, `dist/`, `.env.local`, `.claude/`, raw server output, and secrets are not copied

No-overwrite validation:

```bash
DRY_RUN=false scripts/init-new-repo.sh "$tmp_target"
```

Expected:

- existing files are skipped
- no overwrite happens unless `FORCE=true`

Optional example app validation:

```bash
tmp_example="$(mktemp -d)"
DRY_RUN=false INCLUDE_EXAMPLE_APP=true scripts/init-new-repo.sh "$tmp_example"
```

Expected:

- `backend/` and `frontend/` are copied
- example app docs and smoke scripts are copied

Optional dev deploy validation:

```bash
tmp_deploy="$(mktemp -d)"
DRY_RUN=false INCLUDE_DEV_DEPLOY=true scripts/init-new-repo.sh "$tmp_deploy"
```

Expected:

- Dev Deploy workflow, deploy scripts, runtime scripts, and deployment docs are copied
- the target repository still requires manual GitHub secret/variable review before any real deploy

## v0.1.0 Fresh Repo Trial Results

Trial date: 2026-05-31.

### Default Bootstrap

Result: passed.

Validated:

- dry-run writes no files
- actual init copies template core
- `backend/` and `frontend/` are excluded by default
- `.git/`, `node_modules/`, `dist/`, `.env.local`, `.claude/`, local agent files, secrets, and raw server output are excluded
- generated target passes `make help`, `make doc-check`, `make doc-guard`, and `make release-check`

### Optional Example App

Result: passed after one bootstrap fix.

Validated:

- `INCLUDE_EXAMPLE_APP=true` copies `backend/`, `frontend/`, smoke scripts, and example app docs
- generated target excludes `node_modules`, `dist`, Playwright reports, test results, `.env.local`, and `.claude/`
- generated target passes `make doc-check`, `make doc-guard`, `make release-check`, backend Go tests, and frontend install/build

Fix applied:

- `scripts/init-new-repo.sh` now filters generated and local-only paths during directory copies.

### Optional Dev Deploy

Result: passed.

Validated:

- `INCLUDE_DEV_DEPLOY=true` copies Dev Deploy workflow, deploy/runtime scripts, and deployment docs
- generated target excludes secrets and local-only files
- generated target passes `make doc-check`, `make doc-guard`, and `make release-check`

### No Secrets Or Local-Only Files

Result: passed.

No generated target copied local untracked agent files, `.claude/`, `.env.local`, raw server output, private config, or secrets.

## Docs Check Validation

Run:

```bash
make doc-check
make doc-guard
```

Expected:

- required docs folders exist
- required metadata exists
- naming rules pass
- inbox/archive rules remain intact

## PR Quality Gate Validation

Expected future validation:

- `.github/workflows/pr-quality.yml` exists
- PR Quality Gate can run in the generated repo
- summary check remains the primary branch protection candidate
- checks do not require unavailable backend/frontend/example app files unless included

## No Secrets Validation

Confirm generated repo does not include:

- `.env`
- private SSH keys
- GitHub secret values
- raw server output
- private host config
- local tool credentials

## Example App Inclusion/Exclusion Validation

If the example app is excluded:

- generated repo still passes docs/local checks
- README explains how to start product-specific implementation
- no Internal Task Intake business meaning appears as required product direction

If the example app is included:

- backend tests pass
- frontend build passes
- e2e smoke passes if Playwright is configured
- docs clearly mark it as example material

## GitHub Environment Setup Validation

If dev deploy is enabled for a generated repo:

- GitHub Environment `development` is documented
- required secrets and variables are listed
- target host and deploy root are configurable
- protected host guard is configurable
- production is not configured by default

## Acceptance Criteria For 6E-B Implementation

- bootstrap/init path exists or checklist path is explicitly accepted
- fresh repo can be initialized from Dogsquard
- docs checks pass in initialized repo
- PR Quality Gate path is ready
- example app handling matches approved policy
- agent-local file policy is enforced
- no secrets are copied
- README explains how to use Dogsquard
- `v0.1.0` readiness checklist can be evaluated
