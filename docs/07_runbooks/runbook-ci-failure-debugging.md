---
title: "CI Failure Debugging Runbook"
doc_type: "runbook"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-30"
updated: "2026-05-30"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# CI Failure Debugging Runbook

## Purpose

This runbook explains how to read and reproduce Dogsquard PR Quality Gate failures.

The goal is to fix the underlying issue, not to bypass CI.

## Reading GitHub Actions Failures

1. Open the pull request.
2. Find the failed check.
3. Open the failed GitHub Actions job.
4. Read the first failing step, not only the final summary.
5. Reproduce the failure locally with the matching command.
6. Fix code, docs, tests, or workflow according to the failure type.
7. Push the fix and let CI rerun.

## Job Meanings

### Shell Check

Shell Check runs syntax validation for shell scripts:

```bash
bash -n scripts/*.sh
```

Failure means at least one shell script cannot be parsed.

Common causes:

- missing `fi`, `done`, or quote
- invalid bash syntax
- accidental copy/paste of non-shell text

### Repository Hygiene

Repository Hygiene runs whitespace checks with `git diff --check`.

Failure usually means:

- trailing whitespace
- space before tab in indentation-sensitive contexts
- conflict marker or malformed patch artifact

### Local Foundation

Local Foundation runs:

```bash
make help
make doc-check
make doc-guard
make release-check
```

Failure may come from documentation metadata, naming rules, Go tests, Go formatting, Go vet, frontend build, or available lint/test scripts.

### Playwright Smoke

Playwright Smoke runs the minimal local e2e smoke path through `make e2e-smoke`.

Failure may mean:

- backend did not start
- frontend preview did not start
- frontend build failed
- Playwright browser setup failed
- app did not load
- empty state was not visible
- valid task creation failed
- missing-title validation was not visible

This is not a full regression suite.

### Temporary Scope Guard

Temporary Scope Guard fails when a PR changes paths outside the current phase.

For Phase 5E, deployment, Docker, production release, self-hosted runner, database, auth, and full regression work remain out of scope.

### PR Quality Summary

PR Quality Summary fails if any required job failed or was cancelled.

Open the individual failed job first. Fix the cause there, then let the summary rerun.

## Local Reproduction Commands

Use these commands before opening or updating a PR:

```bash
make doc-check
make doc-guard
make release-check
bash -n scripts/*.sh
git diff --check
cd backend && go test ./...
cd frontend && npm install
cd frontend && npm run build
make e2e-smoke
```

Run commands from the repository root unless the command explicitly changes directories.

## Common Causes

Documentation failures:

- missing front matter
- wrong document filename pattern
- missing `## Unreleased` in `CHANGELOG.md`
- behavior changed without a matching PRD, BDD, test plan, or runbook update

Backend failures:

- Go formatting drift
- failing handler or store tests
- invalid API behavior after a hardening change

Frontend failures:

- TypeScript build error
- missing dependency install
- API base URL mismatch
- UI text changed without updating the smoke test

Workflow failures:

- required job not listed in `PR Quality Summary`
- unsupported runner image
- missing setup step for a tool used in CI
- scope guard pattern too broad or too narrow for the current phase

## Choosing What To Fix

Fix code when behavior is wrong.

Fix tests when the expected behavior is still correct but the test no longer matches the UI or API contract.

Fix docs when the behavior or process changed and the documentation is stale.

Fix workflow only when CI no longer represents the intended deterministic gate.

Do not alter product meaning just to satisfy a check.

## When Not To Bypass CI

Do not bypass CI for:

- agent-generated code that has not been locally reproduced
- documentation rule failures
- Playwright smoke failures caused by real UI/API breakage
- convenience merges
- unclear failures that have not been investigated

CI is the deterministic authority for technical merge readiness.

## Hotfix Notes

Hotfix bypass should be rare and explicit.

If a hotfix bypasses normal CI:

- record the reason in the related issue or PR
- run the closest local validation possible
- restore CI health immediately afterward
- add missing tests or docs in a follow-up PR

## Agent Instructions

When an agent debugs CI:

- read the failed job logs before changing files
- reproduce locally when possible
- keep fixes scoped to the failing behavior
- update docs when workflow or behavior changes
- do not invent product requirements
- do not disable checks to make a PR pass
- ask the human owner before changing branch protection or release policy
