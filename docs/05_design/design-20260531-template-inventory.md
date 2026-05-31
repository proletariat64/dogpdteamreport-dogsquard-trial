---
title: "Dogsquard Template Inventory"
doc_type: "design"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-31"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# Dogsquard Template Inventory

## Purpose

Define which Dogsquard files belong to the reusable template core, which files are optional, and which files must stay local-only.

This inventory supports `scripts/init-new-repo.sh`.

## Template Core Files

The default bootstrap copies the conservative core needed to start a new repository with Dogsquard governance and local validation:

- `README.md` starter content
- `CHANGELOG.md` starter content
- `.env.example`
- `.gitignore`
- `Makefile`
- `.github/ISSUE_TEMPLATE/`
- `.github/pull_request_template.md`
- `.github/labels.yml`
- `.github/workflows/pr-quality.yml`
- documentation governance folders under `docs/`
- core documentation governance docs
- Control Board and roadmap guidance docs
- PR Quality Gate runbooks and test docs
- local documentation scripts:
  - `scripts/doc-check-local.sh`
  - `scripts/doc-guard.sh`
  - `scripts/lib-doc-rules.sh`
  - `scripts/watch-docs.sh`
  - `scripts/agent-doc-review.sh`

The default output is intended to pass document checks without forcing a business product direction.

## Optional Example App Files

The example Internal Task Intake app is validation and reference material, not mandatory business starter logic.

When `INCLUDE_EXAMPLE_APP=true`, the bootstrap also copies:

- `backend/`
- `frontend/`
- `scripts/e2e-smoke.sh`
- `scripts/smoke-api.sh`
- example app PRD, BDD, ADR, test plan, and local development runbook

Future product repositories should include this only when the example app is useful as a reference or test fixture.

## Optional Dev Deploy Files

Dev deploy is available as a pattern, but new repositories may not need it immediately.

When `INCLUDE_DEV_DEPLOY=true`, the bootstrap also copies:

- `.github/workflows/deploy-dev.yml`
- `scripts/package-release.sh`
- `scripts/deploy-dev.sh`
- `scripts/remote-deploy.sh`
- `scripts/runtime-dev.sh`
- `scripts/remote-runtime.sh`
- `scripts/server-preflight.sh`
- dev deployment PRDs, BDDs, ADRs, runbooks, and test plans

Generated repositories must still review host, deploy root, port, and protected-target settings before enabling any real deploy.

## Excluded From Bootstrap

The bootstrap must not copy:

- `.git/`
- `node_modules/`
- `dist/`
- `frontend/dist/`
- `playwright-report/`
- `test-results/`
- `.env.local`
- `.claude/`
- private SSH config or keys
- raw server output
- secrets
- local machine-specific files
- deployment artifacts or tarballs

Directory copy operations also filter generated and local-only paths inside optional assets, so optional example app copies do not bring along `frontend/node_modules`, `frontend/dist`, Playwright reports, or test results from the Dogsquard working tree.

## Local-Only Files Policy

Tool-local and session-specific files are not part of the template core.

Policy:

- Do not commit `.claude/`.
- Do not copy local `AGENTS.md`, `CLAUDE.md`, or `roster.md` unless the user explicitly approves a generic reusable version.
- Prefer reusable agent guidance in repository docs, especially `docs/05_design/design-20260530-agent-charter.md`.
- Use future `AGENTS.example.md` or similar template files only if the content is generic and safe for all generated repositories.
- Never include secrets, local filesystem paths, private keys, or personal session state.

## Placeholder And Manual Replacement Notes

The first bootstrap implementation is conservative and does not rewrite all project names automatically.

After bootstrap, the user should manually review:

- project name
- app name
- Go module name, if a backend is added
- frontend package name, if a frontend is added
- GitHub repository links
- development host and deploy root
- protected production host and domain rules
- Control Board wording
- README and changelog starting content

Future implementation may add explicit placeholder replacement after the expected target project fields are stable.

## Future Improvements

Possible future improvements:

- optional placeholder replacement
- `AGENTS.example.md` generation
- selectable template profiles
- label creation helper
- generated first Control Board body
- bootstrap verification command for target repositories
- optional example app relocation under `examples/`
