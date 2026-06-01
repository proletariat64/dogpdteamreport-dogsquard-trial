---
title: "Dev High-port Access"
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

# Dev High-port Access

## Purpose

Document the default Dogsquard dev access shape generated for applicable bootstrap profiles.

## Current Dev Target

- Dev host: `cn.ant`
- Firewall allows: `80`, `22`, `443`, `8000-8999`, and ICMP.
- Frontend public/dev candidate port: `8173`
- Backend public/dev candidate port: `8180`

## Scope

High-port access is for dev validation only.

Do not use this as production deployment.
Do not target `us.hermes`.
Do not claim `proletariat.icu` `/` or `/api`.
Do not commit secrets.

## Future Route Option

A future HTTP-only dev route may use a path under `dev.proletariat.icu/xxxx` on `cn.ant`, after explicit routing design.

## Production Separation

Production deployment remains separate and requires explicit approval before implementation.
