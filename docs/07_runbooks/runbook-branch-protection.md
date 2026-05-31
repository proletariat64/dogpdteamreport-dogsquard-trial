---
title: "Branch Protection Runbook"
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

# Branch Protection Runbook

## Purpose

This runbook describes how the repository owner should configure GitHub branch protection for Dogsquard after the PR Quality Gate has proven stable.

Phase 5E does not configure branch protection automatically. These are manual GitHub repository settings.

## Why Branch Protection Matters

Dogsquard is intended to be a reusable bootstrap kit where agents do most implementation work and the human owner controls direction, review, and release decisions.

Branch protection keeps that operating model enforceable by making `main` depend on pull requests, deterministic checks, and human review habits instead of local memory or agent discipline.

## Recommended Protected Branch

Protect:

```text
main
```

Use one focused PR per phase or task. Do not commit directly to `main` during normal work.

## Recommended Settings

Enable these settings for `main`:

- require a pull request before merging
- require status checks to pass before merging
- require `PR Quality Summary`
- require branches to be up to date before merging when this does not slow down solo work too much
- require conversation resolution before merging
- block direct pushes to `main` during normal work

For a solo developer repository, do not overfit enterprise rules. The goal is to prevent accidental bypasses while keeping maintenance lightweight.

## Required Check

Use this as the main required status check:

```text
PR Quality Summary
```

The summary job depends on the individual quality jobs. Requiring only the summary keeps branch protection simple while still enforcing the whole current gate.

## Solo-Developer Recommendation

For one-person maintenance:

- require PRs even for owner-authored changes
- require `PR Quality Summary`
- keep review approval optional unless the owner wants a deliberate pause before merge
- require conversation resolution so unresolved review threads are not lost
- allow admin bypass only for documented emergencies

The owner remains final authority, but branch protection should make bypasses visible and intentional.

## Hotfix Exception Policy

Use a hotfix exception only when waiting for normal PR flow would create higher operational risk.

Hotfix expectations:

- open or update an issue describing the emergency
- keep the patch as small as possible
- run local validation before and after the hotfix when possible
- open a follow-up PR if any guard was bypassed
- update docs or tests after the immediate issue is stabilized

Do not use hotfix exceptions for convenience, unfinished documentation, or agent uncertainty.

## Skip-Docs Policy

`skip-docs` may be used only with explicit justification.

Acceptable examples:

- mechanical typo fix with no behavior or process change
- formatting-only change that does not affect documented workflow
- dependency metadata change with no user-visible behavior change

Do not use `skip-docs` for product behavior changes, architecture direction changes, release process changes, or CI/CD policy changes.

## Manual GitHub UI Setup

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Open `Branches`.
4. Add or edit a branch protection rule for `main`.
5. Enable `Require a pull request before merging`.
6. Enable `Require status checks to pass before merging`.
7. Select `PR Quality Summary` as the required check.
8. Consider enabling `Require branches to be up to date before merging`.
9. Enable `Require conversation resolution before merging`.
10. Save the rule.

Do not add automation for branch protection in Phase 5E.

## When To Revisit

Revisit branch protection when:

- new required CI jobs are added
- full Playwright regression becomes stable
- deployment checks are introduced
- production release gates are introduced
- self-hosted runner UAT becomes part of the workflow
- the repository moves from solo maintenance to shared maintenance

Any rule change should be reflected in the Control Board and relevant runbooks.
