---
title: "CI/CD Implementation Plan"
doc_type: "design"
status: "draft"
owner: "devops-agent"
source: "chat"
created: "2026-05-30"
updated: "2026-05-30"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# CI/CD Implementation Plan

## Goal

Build a practical GitHub-based CI/CD system for `dogsquard` that supports solo development, keeps documentation rules in order, and separates fast local feedback from official merge and deployment gates.

The target operating model is:

```text
Local workstation = fast TDD, doc watcher, optional coding agent
GitHub Actions = official quality gate and deployment controller
Cloud dev host = real development deployment target
Cloud production host = stable production runtime with approval
Optional self-hosted runner = heavy UAT, private-network, or multica integration work
Doc Watch Guard Agent = documentation cleanup, naming, placement, archive, and order enforcement
```

## Key Decisions

### 1. Use GitHub Actions as the CI/CD authority

GitHub Actions should be the official source of truth for:

- PR quality checks
- linting
- unit tests
- documentation checks
- build checks
- Playwright smoke tests
- dev deployment
- production deployment approval flow

Local agents and CLI tools can help, but they should not replace deterministic CI checks.

### 2. Treat documentation governance as project-level scope

Documentation rules are not optional notes. They are part of the project operating system.

The project must define and enforce:

- document types
- naming rules
- folder placement rules
- update tracking rules
- archive rules
- ownership rules
- generated-document cleanup rules
- agent behavior rules

This is in full scope for the CI/CD foundation because most project knowledge will be created through conversations between the user and AI agents.

### 3. Separate user requirement documents from generated working documents

Business/user requirement documents are treated as first-class source documents.

Recommended folder split:

```text
docs/
  00_inbox/        temporary generated notes waiting for classification
  01_brd/          business requirement documents from user/product need
  02_prd/          product requirement documents
  03_bdd/          behavior scenarios and acceptance criteria
  04_adr/          architecture decision records
  05_design/       non-code product/design notes
  06_testing/      test plans, UAT notes, E2E scope
  07_runbooks/     operations and deployment procedures
  08_releases/     release notes and release decisions
  90_archive/      outdated documents preserved for history
```

Generated documents should not stay loose in the repo root. If an agent creates a document and the destination is unclear, it goes to `docs/00_inbox/` first.

### 4. Use local watcher as advisory support

A local watcher should run on the Ubuntu workstation and warn early when documentation rules are violated.

It should check:

- code changed but docs did not change
- `CHANGELOG.md` missing or not updated
- missing required documentation folders
- bad BRD / PRD / BDD / ADR filename format
- generated docs stuck in the wrong place
- stale inbox documents
- missing status metadata
- missing owner/source fields
- duplicate or conflicting generated docs

Local watcher result is advisory. GitHub Actions remains the official gate.

### 5. Use Doc Watch Guard Agent for cleanup and order only

A backend local watcher agent can run to keep documentation organized.

Allowed behavior:

- rename files to match naming rules
- move files to the correct folder
- archive stale or superseded generated documents
- update index files
- add missing metadata fields when derivable from context
- detect duplicate documents
- report conflicts
- prepare cleanup diffs

Forbidden behavior:

- invent new product ideas
- change business meaning
- silently rewrite requirements
- delete source requirement documents
- mark open decisions as decided
- bypass deterministic checks
- auto-commit without explicit user approval unless a later policy allows it

The guard agent is a librarian, not a product owner.

### 6. Agent model and usage policy

Default design/coding agent:

```text
Codex / primary coding agent
```

Fallback design/coding agent:

```text
Claude Code only when Codex agent token limit is reached or when explicitly chosen
```

Doc Watch Guard Agent:

```text
Claude Code or equivalent local CLI using a fast backend model such as DeepSeek V4 Flash, if available in the user's local setup
```

Important rule:

```text
Do not hardcode unverified model names, CLI commands, config schemas, or versions in repository automation.
Use wrapper scripts and local settings files so agents can be swapped without changing CI rules.
```

### 7. Use Claude Code CLI or other coding agents only as optional helpers

Agent CLI usage is allowed for:

- reviewing local git diff
- suggesting documentation updates
- drafting PRD / BDD / ADR content when explicitly requested
- explaining failed CI logs
- generating PR summaries
- helping with Playwright scripts
- cleaning and classifying generated documentation

Agent CLI should not be required for merge. It should not be allowed to silently bypass CI, auto-deploy production, or invent documentation just to satisfy a rule.

### 8. Start with GitHub-hosted runners

Use GitHub-hosted runners first for:

- PR lint
- Go tests
- frontend tests
- build checks
- documentation gate
- Playwright smoke tests
- release packaging

Add a self-hosted runner later only if needed for:

- heavy Playwright UAT
- private network checks
- access to the real `multica` container
- Docker cache / faster integration tests
- server-local deployment verification

### 9. Use cloud hosts as deployment targets

Do not use the production host as the main CI runner at the beginning.

Recommended split:

```text
GitHub-hosted runner:
  - build
  - test
  - package
  - SSH deploy

Cloud dev host:
  - dev runtime
  - Docker Compose
  - SSL/domain verification

Cloud production host:
  - production runtime
  - manual approval required
  - tag or workflow_dispatch based deploy
```

### 10. Use Docker for runtime parity, native commands for TDD speed

Local development should support both native and Docker workflows.

Native local commands:

```bash
go test ./...
npm test
npm run dev
```

Docker workflow:

```bash
docker compose up -d --build
```

Recommended rule:

```text
TDD speed = native local
Deployment confidence = Docker / Docker Compose
```

### 11. Do not run full E2E on every PR initially

Recommended testing policy:

```text
Every PR:
  - lint
  - unit tests
  - typecheck
  - build
  - documentation gate
  - Playwright smoke tests only

Merge to main:
  - deploy to dev
  - post-deploy smoke verification

Before production release:
  - full Playwright regression
  - manual approval
  - tag vX.Y.Z or workflow_dispatch

Epic branch:
  - manual UAT deploy
  - larger Playwright suite
```

This keeps normal development fast while preserving release confidence.

## Documentation Governance Rules

### Document type map

| Type | Folder | Purpose | Owner |
|---|---|---|---|
| BRD | `docs/01_brd/` | Business/user requirements | User / product owner |
| PRD | `docs/02_prd/` | Product behavior and scope | Product agent + user review |
| BDD | `docs/03_bdd/` | Acceptance scenarios | Product/testing agent |
| ADR | `docs/04_adr/` | Architecture decisions | Developer/architecture agent + user review |
| Design Note | `docs/05_design/` | Non-code design discussion | Design agent |
| Test Plan | `docs/06_testing/` | QA, E2E, UAT plans | Testing agent |
| Runbook | `docs/07_runbooks/` | Ops/deployment procedures | DevOps agent |
| Release Note | `docs/08_releases/` | Release summary and risk | Release agent |
| Inbox | `docs/00_inbox/` | Unclassified generated docs | Doc Watch Guard Agent |
| Archive | `docs/90_archive/` | Superseded historical docs | Doc Watch Guard Agent |

### Naming rules

Use lowercase kebab-case filenames.

Recommended patterns:

```text
BRD:          brd-YYYYMMDD-short-topic.md
PRD:          prd-YYYYMMDD-short-topic.md
BDD:          bdd-YYYYMMDD-short-topic.md
ADR:          0001-short-decision-title.md
Design Note: design-YYYYMMDD-short-topic.md
Test Plan:   test-YYYYMMDD-short-topic.md
Runbook:     runbook-short-operation.md
Release:     release-vX.Y.Z.md
Inbox:       inbox-YYYYMMDD-HHMM-source-topic.md
Archive:     archived-YYYYMMDD-original-name.md
```

Examples:

```text
docs/01_brd/brd-20260530-ci-cd-operating-model.md
docs/02_prd/prd-20260530-doc-governance.md
docs/03_bdd/bdd-20260530-pr-quality-gate.md
docs/04_adr/0001-use-github-actions-as-ci-authority.md
docs/06_testing/test-20260530-release-e2e-policy.md
docs/07_runbooks/runbook-dev-deploy.md
```

### Required document metadata

Every non-trivial document should start with:

```yaml
---
title: ""
doc_type: "brd|prd|bdd|adr|design|test|runbook|release|inbox|archive"
status: "draft|review|approved|superseded|archived"
owner: "user|product-agent|coding-agent|doc-watch-guard|devops-agent"
source: "user|agent|chat|github|manual"
created: "YYYY-MM-DD"
updated: "YYYY-MM-DD"
related_issue: ""
related_pr: ""
supersedes: ""
---
```

The Doc Watch Guard Agent may add missing metadata only when it can be derived safely. Otherwise it must leave a warning.

### Status lifecycle

```text
draft -> review -> approved -> superseded -> archived
```

Rules:

- `draft` can be edited freely.
- `review` requires user/product review.
- `approved` should not be silently rewritten.
- `superseded` must point to the replacing document.
- `archived` must preserve historical content.

### Update tracking rules

When code or behavior changes, update at least one of:

```text
CHANGELOG.md
docs/01_brd/
docs/02_prd/
docs/03_bdd/
docs/04_adr/
docs/06_testing/
docs/07_runbooks/
docs/08_releases/
```

When deployment behavior changes, update:

```text
docs/07_runbooks/
```

When architecture decisions change, update:

```text
docs/04_adr/
```

When acceptance behavior changes, update:

```text
docs/03_bdd/
```

When release risk changes, update:

```text
docs/08_releases/
CHANGELOG.md
```

### Archive rules

Archive only when:

- document is superseded by a newer one
- document is obsolete but historically useful
- generated working notes are no longer active

Archive destination:

```text
docs/90_archive/YYYY/MM/
```

Never delete BRD/PRD/ADR documents automatically.

### Generated chat document rules

Most generated documents are produced from conversations with agents. They must be normalized before becoming project records.

Rules:

- raw generated documents go to `docs/00_inbox/` first if their type is unclear
- Doc Watch Guard Agent classifies and proposes placement
- user requirement documents become BRD only after user confirmation or clear source evidence
- generated ideas remain drafts until reviewed
- conflicting documents must be reported, not merged silently

## Target Repository Structure

```text
.
├── .github/
│   ├── workflows/
│   │   ├── pr-quality.yml
│   │   ├── doc-check.yml
│   │   └── deploy.yml
│   ├── ISSUE_TEMPLATE/
│   │   ├── feature.yml
│   │   └── bug.yml
│   └── pull_request_template.md
├── docs/
│   ├── 00_inbox/
│   ├── 01_brd/
│   ├── 02_prd/
│   ├── 03_bdd/
│   ├── 04_adr/
│   ├── 05_design/
│   ├── 06_testing/
│   ├── 07_runbooks/
│   ├── 08_releases/
│   └── 90_archive/
├── scripts/
│   ├── doc-check-local.sh
│   ├── watch-docs.sh
│   ├── doc-guard.sh
│   ├── e2e-ci.sh
│   ├── remote-deploy.sh
│   └── agent-doc-review.sh
├── backend/
├── frontend/
├── Makefile
├── CHANGELOG.md
└── .env.example
```

## Implementation Phases

## Phase 1: Documentation Governance Foundation

### Objective

Create project-level documentation rules before coding CI. This phase defines how agents and humans must name, place, update, track, and archive documents.

### Files to add

```text
docs/00_inbox/.gitkeep
docs/01_brd/.gitkeep
docs/02_prd/.gitkeep
docs/03_bdd/.gitkeep
docs/04_adr/.gitkeep
docs/05_design/.gitkeep
docs/06_testing/.gitkeep
docs/07_runbooks/.gitkeep
docs/08_releases/.gitkeep
docs/90_archive/.gitkeep
docs/02_prd/prd-YYYYMMDD-doc-governance.md
docs/03_bdd/bdd-YYYYMMDD-doc-governance.md
docs/04_adr/0001-use-github-actions-as-ci-authority.md
scripts/doc-check-local.sh
scripts/watch-docs.sh
scripts/doc-guard.sh
scripts/agent-doc-review.sh
Makefile
.env.example
CHANGELOG.md
```

### Required local commands

```bash
make doc-check
make watch-docs
make doc-guard
make agent-docs
make release-check
```

### Acceptance criteria

- documentation folders exist
- naming rules are documented
- metadata rules are documented
- doc check validates folder structure and basic naming
- Doc Watch Guard wrapper exists
- agent wrapper does not assume unverified model names or CLI schemas

## Phase 2: Local Development Foundation

### Objective

Make local development and documentation rules repeatable before adding complex GitHub Actions.

### Files to add

```text
Makefile
scripts/doc-check-local.sh
scripts/watch-docs.sh
scripts/agent-doc-review.sh
.env.example
CHANGELOG.md
```

### Required local commands

```bash
make test
make lint
make release-check
make watch-docs
make agent-docs
```

### Acceptance criteria

- `make release-check` works locally
- documentation folders exist
- doc check fails when code changes but docs do not
- doc check can explain what is missing
- agent wrapper exists but does not assume a specific model name or CLI schema

## Phase 3: PR Quality Gate

### Objective

Every pull request must pass deterministic quality checks before merge.

### Workflow file

```text
.github/workflows/pr-quality.yml
```

### Required checks

- Go lint
- Go unit tests
- frontend lint
- frontend typecheck
- frontend tests
- build checks
- documentation gate
- Playwright smoke E2E for normal PRs

### Labels

```text
feat       normal feature
bug        bug fix
epic       large feature; skip normal PR E2E and use manual UAT
hotfix     urgent fix; may skip heavy E2E but not unit tests
skip-docs  allow documentation gate bypass with justification
```

### Acceptance criteria

- PR cannot merge if deterministic checks fail
- `epic` label does not run full PR E2E
- `hotfix` label still keeps unit tests and documentation discipline
- `skip-docs` is explicit and visible

## Phase 4: Documentation Gate

### Objective

Make documentation consistency part of the development lifecycle.

### Workflow file

```text
.github/workflows/doc-check.yml
```

### Rules

When product or source code changes, at least one relevant documentation path should change:

```text
README.md
CHANGELOG.md
docs/01_brd/
docs/02_prd/
docs/03_bdd/
docs/04_adr/
docs/06_testing/
docs/07_runbooks/
docs/08_releases/
```

Bypass rule:

```text
skip-docs label is allowed, but should require PR explanation.
```

### Acceptance criteria

- PR fails when meaningful code changes do not update docs
- `CHANGELOG.md` format is checked
- naming format is checked
- local and GitHub checks share the same core logic where possible

## Phase 5: Development Deployment

Phase 6A update: dev deployment direction is now documented in `docs/02_prd/prd-20260530-dev-deployment.md`, `docs/04_adr/0003-use-ssh-artifact-deploy-for-dev.md`, `docs/03_bdd/bdd-20260530-dev-deployment.md`, `docs/06_testing/test-20260530-dev-deployment.md`, and `docs/07_runbooks/runbook-dev-deployment.md`.

The accepted Phase 6A direction is GitHub Actions building, testing, packaging, and later deploying a dev artifact over SSH to a cloud host. Docker, Docker Compose, self-hosted runner, production deployment, and server configuration changes remain out of scope for Phase 6A.

### Objective

After merge to `main`, deploy automatically to the development cloud host.

### Workflow file

```text
.github/workflows/deploy.yml
```

### Trigger

```text
push to main
```

### Deployment behavior

```text
main merge
  -> build release artifact
  -> upload artifact
  -> SSH to dev host
  -> unpack into release directory
  -> update current symlink
  -> start or reload dev runtime in a later implementation phase
  -> run smoke verification
```

### Required secrets

```text
DEV_HOST
DEV_USER
DEV_SSH_KEY
DEV_DEPLOY_PATH
```

### Acceptance criteria

- merge to `main` deploys to dev automatically
- failed dev deploy is visible in GitHub Actions
- old releases are retained for rollback
- smoke test runs after deploy

## Phase 6: Production Deployment

### Objective

Production deploys should be intentional, approved, and traceable.

### Triggers

```text
tag push: v*.*.*
manual workflow_dispatch
```

### Required GitHub environment

```text
production
```

Recommended setting:

```text
Settings -> Environments -> production -> Required reviewers
```

### Required secrets

```text
PROD_HOST
PROD_USER
PROD_SSH_KEY
PROD_DEPLOY_PATH
```

### Acceptance criteria

- production deploy does not happen from normal PR
- production deploy requires tag or manual trigger
- production environment approval is enabled
- full E2E or release smoke tests run before / after deploy

## Phase 7: Optional Self-Hosted Runner

### Objective

Use a cloud host runner only for work that GitHub-hosted runners cannot do well.

### Use cases

- heavy UAT Playwright suite
- multica integration verification
- private server/network checks
- long-running browser tests
- Docker-cache-heavy jobs

### Security rule

Do not run untrusted public PR code on the self-hosted runner.

### Recommended labels

```text
self-hosted
linux
x64
uat
```

### Acceptance criteria

- self-hosted runner is not required for normal PR quality gate
- self-hosted runner is used only for manual UAT or trusted branches
- secrets are scoped carefully

## Phase 8: Branch Protection and GitHub Settings

### Main branch protection

Require:

```text
Pull request before merge
Required status checks
Conversation resolution
No direct push to main if possible
```

Recommended required checks:

```text
PR Quality Gate
Documentation Gate
Build Check
Playwright Smoke
```

### Environments

Create:

```text
development
uat
production
```

Recommended behavior:

```text
development = automatic after main merge
uat = manual workflow_dispatch
production = tag/manual + approval
```

## Doc Watch Guard Agent Policy

Add a wrapper script:

```text
scripts/doc-guard.sh
```

The wrapper should:

- scan `docs/`
- detect wrong naming
- detect wrong placement
- detect missing metadata
- detect stale inbox documents
- detect duplicate generated docs
- optionally call a verified local agent CLI
- prepare a cleanup report or patch
- avoid changing product meaning

Initial safe behavior:

```bash
./scripts/doc-guard.sh
```

prints a cleanup report and suggested actions. Later it may run in apply mode:

```bash
./scripts/doc-guard.sh --apply
```

Apply mode should be conservative and limited to:

- renaming files
- moving files
- creating archive folders
- updating index files
- adding missing metadata only when safe

## Local Agent Wrapper Policy

Add a wrapper script:

```text
scripts/agent-doc-review.sh
```

The wrapper should:

- inspect `git diff`
- generate an agent prompt
- optionally call the verified local CLI command
- never hardcode unverified model names
- never be required for merge
- never commit automatically unless explicitly requested

Initial safe behavior:

```bash
./scripts/agent-doc-review.sh
```

prints a prompt like:

```text
Review the current git diff. If product behavior changed, suggest updates to README.md, CHANGELOG.md, docs/01_brd, docs/02_prd, docs/03_bdd, docs/04_adr, docs/06_testing, docs/07_runbooks, or docs/08_releases. Do not invent facts. Do not change files unless explicitly instructed.
```

## E2E Policy

### PR smoke tests

Run on normal PRs:

- app loads
- core navigation works
- one critical CRUD path works
- auth/session smoke if applicable

### Full E2E regression

Run before production release:

- full dashboard flows
- CRUD happy paths
- validation errors
- permission cases
- critical integration paths

### Epic UAT

Run manually on a specific branch:

```text
Actions -> Deploy -> workflow_dispatch
environment = uat
ref = feature/epic-name
run_e2e = true
```

## Rollback Strategy

Every deployment should create a timestamped release directory:

```text
/opt/dogsquard/releases/20260530120000
/opt/dogsquard/current -> /opt/dogsquard/releases/20260530120000
```

Rollback means switching `current` to the previous release and restarting Docker Compose or the systemd service.

## First Pull Request Scope

The first implementation PR should add documentation governance and local foundation files:

```text
Makefile
.env.example
CHANGELOG.md
docs/00_inbox/.gitkeep
docs/01_brd/.gitkeep
docs/02_prd/.gitkeep
docs/03_bdd/.gitkeep
docs/04_adr/.gitkeep
docs/05_design/.gitkeep
docs/06_testing/.gitkeep
docs/07_runbooks/.gitkeep
docs/08_releases/.gitkeep
docs/90_archive/.gitkeep
scripts/doc-check-local.sh
scripts/watch-docs.sh
scripts/doc-guard.sh
scripts/agent-doc-review.sh
```

Do not add deployment yet in the first PR.

## Second Pull Request Scope

Add PR checks:

```text
.github/workflows/pr-quality.yml
.github/workflows/doc-check.yml
.github/pull_request_template.md
.github/ISSUE_TEMPLATE/feature.yml
.github/ISSUE_TEMPLATE/bug.yml
```

## Third Pull Request Scope

Add deployment:

```text
.github/workflows/deploy.yml
scripts/remote-deploy.sh
```

## Success Criteria

The CI/CD system is considered ready when:

- local `make release-check` works
- PR checks block bad merges
- docs are enforced or explicitly skipped
- generated documents are classified and named consistently
- Doc Watch Guard Agent can clean, archive, and reorganize without inventing product meaning
- dev deploy runs after `main` merge
- production deploy requires tag/manual trigger and approval
- E2E policy is fast for PRs and strict for releases
- optional agent tooling helps but does not control the pipeline
