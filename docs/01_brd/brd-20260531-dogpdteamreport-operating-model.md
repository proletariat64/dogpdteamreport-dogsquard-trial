---
title: "dogpdteamreport Operating Model"
doc_type: "brd"
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

Define how this trial repository should operate while adopting Dogsquard governance.

# Business Context

`dogpdteamreport` is a Node.js, Express, TypeScript, sql.js, and static frontend application for department product, goal, team, and person management.

This repository is a trial copy used to validate Dogsquard governance on a real project. The original `dogpdteamreport` repository must not be modified by this trial.

# Operating Model

- Preserve the existing app code, README, DDD docs, and technical specs.
- Use Dogsquard documentation governance for new planning and review docs.
- Use issue and PR templates for scoped work.
- Use PR Quality Gate for deterministic checks.
- Keep deployment out of scope for the first adoption PR.

# Existing Docs

Existing `ddd/` and `spec/` directories remain project-specific source material. New Dogsquard-governed docs live under `docs/`.

# Success Criteria

- The trial repo can run local checks.
- The first adoption PR adds governance without changing product behavior.
- Future PRs can use the Control Board and Dogsquard docs workflow.
