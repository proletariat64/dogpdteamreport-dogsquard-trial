---
title: "GitHub Labels"
doc_type: "runbook"
status: "draft"
owner: "devops-agent"
source: "agent"
created: "2026-05-30"
updated: "2026-05-30"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# GitHub Labels Runbook

## Purpose

Dogsquard uses GitHub labels to make issue and PR state visible without relying on agent memory.

Labels support:

- work type classification
- flow control
- agent usage disclosure
- priority triage
- explicit documentation bypass review

## Source of Truth

`.github/labels.yml` is the source of truth for desired repository labels until label automation exists.

Phase 3 does not add label sync automation. The file documents the desired label set and should be applied manually.

## Required Labels

Core work labels:

- `feat`
- `bug`
- `task`
- `docs`
- `test`
- `refactor`
- `ci`
- `release`
- `process`

Flow control labels:

- `epic`
- `hotfix`
- `skip-docs`
- `uat`
- `blocked`
- `needs-review`
- `ready`

Agent labels:

- `agent-generated`
- `codex`
- `claude-code`
- `kimi`
- `hermes`
- `doc-watch-guard`

Priority labels:

- `p0`
- `p1`
- `p2`
- `p3`

## Manual Setup Steps

1. Open the repository in GitHub.
2. Go to `Issues`.
3. Open `Labels`.
4. For each entry in `.github/labels.yml`, create or edit the matching label.
5. Copy the `name`, `color`, and `description` exactly from `.github/labels.yml`.
6. Remove or ignore default labels only when they conflict with the Dogsquard label model.
7. Re-check Issue `#1` and active PRs after label changes.

## Operating Rules

- Use `feat`, `bug`, or `task` as the primary issue type label.
- Use `docs`, `test`, `ci`, `release`, or `process` when the work is mainly in that area.
- Use `skip-docs` only with explicit justification.
- Use agent labels when a named agent materially assisted with the work.
- Use `p0` through `p3` for priority only when prioritization is useful.
- Do not treat labels as a replacement for required issue or PR content.

## Future Automation

A later phase may add label sync automation.

Until then, manual GitHub UI setup is expected and `.github/labels.yml` remains the reference.
