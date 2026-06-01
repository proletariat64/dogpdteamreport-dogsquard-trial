---
title: "Adopt Dogsquard Governance"
doc_type: "adr"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-31"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# Status

Draft.

# Context

`dogpdteamreport` is an existing Node.js and Express application with project-specific DDD and spec documents. Dogsquard v0.1.0 provides reusable repository governance, local commands, issue/PR templates, and PR quality checks.

# Decision

Adopt Dogsquard governance in the trial repository without changing product behavior or deployment.

The first adoption PR includes docs governance, local Makefile commands, issue/PR templates, and a Node-specific PR Quality Gate. It does not include Dogsquard example app files or Dogsquard dev deployment workflow.

# Consequences

- New planning and review work can follow Dogsquard conventions.
- Existing `ddd/` and `spec/` material remains the product-specific knowledge base.
- CI is aligned with the Node project instead of the Dogsquard example Go/frontend app.
- Deployment remains a separate future decision.

# Alternatives Considered

- Copy Dogsquard wholesale, including example app and dev deployment: rejected because it would confuse this project with Dogsquard validation assets.
- Keep the trial repo as a plain copy only: rejected because it would not test Dogsquard governance on a real project.
