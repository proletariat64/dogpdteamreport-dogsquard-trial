---
title: "v0.1.0 Candidate"
doc_type: "release"
status: "draft"
owner: "user"
source: "agent"
created: "2026-05-31"
updated: "2026-05-31"
related_issue: "#1"
related_pr: ""
supersedes: ""
---

# v0.1.0 Candidate

## Purpose

Define what Dogsquard needs before it can be treated as a first reusable bootstrap-kit candidate.

`v0.1.0` is a template readiness milestone, not a production product release.

## Included Capabilities

The candidate includes:

- documentation governance structure and checks
- Makefile command center
- GitHub issue and PR templates
- PR Quality Gate workflow
- Control Board and roadmap operating model
- example Internal Task Intake app as optional validation material
- API smoke and minimal Playwright smoke support
- cn.ant dev deploy pattern and runtime management
- Dev Deploy GitHub Actions workflow as optional template material
- new-repo bootstrap script and runbook
- agent operating guidance through reusable docs

## Excluded Capabilities

The candidate does not include:

- production deployment
- public URL exposure by default
- `us.hermes` route changes
- `proletariat.icu` root or `/api` ownership
- Docker or Docker Compose conversion
- database or auth
- self-hosted runner setup
- full product generator behavior
- automatic GitHub label synchronization

## Readiness Checklist

- [x] Control Board dashboard is current.
- [x] Roadmap reflects completed capability groups and next milestone.
- [x] README explains how to use Dogsquard.
- [x] Template inventory is complete enough for bootstrap review.
- [x] `scripts/init-new-repo.sh` dry-run works.
- [x] `scripts/init-new-repo.sh` actual copy works in a temporary target.
- [x] Example app is optional, not mandatory.
- [x] Dev deploy files are optional, not mandatory.
- [x] Agent-local file policy is documented and enforced.
- [x] `make doc-check` passes.
- [x] `make doc-guard` passes.
- [x] `make release-check` passes.
- [x] `make e2e-smoke` passes.
- [x] `make package-release` passes.
- [x] No secrets or raw server output are committed.
- [x] Production remains explicitly future.

## Fresh New-Repo Trial

Trial date: 2026-05-31.

### Default Bootstrap Result

Validated:

- default dry-run printed planned actions and wrote no files
- `DRY_RUN=false` copied template core into a temporary target
- generated target included README, CHANGELOG, Makefile, `.env.example`, docs structure, local doc scripts, GitHub templates, and PR Quality Gate workflow
- generated target did not include `backend/`, `frontend/`, `.git/`, `node_modules/`, `dist/`, `.env.local`, `.claude/`, `AGENTS.md`, `CLAUDE.md`, `roster.md`, secrets, or raw server output
- generated target passed:
  - `make help`
  - `make doc-check`
  - `make doc-guard`
  - `make release-check`

### Optional Example App Result

Validated:

- `INCLUDE_EXAMPLE_APP=true` copied `backend/`, `frontend/`, API smoke script, e2e smoke script, and example app docs
- generated example target excluded generated/local-only files such as `node_modules`, `dist`, Playwright reports, `.env.local`, and `.claude/`
- generated example target passed:
  - `make doc-check`
  - `make doc-guard`
  - `make release-check`
  - `cd backend && go test ./...`
  - `cd frontend && npm install && npm run build`

### Optional Dev Deploy Result

Validated:

- `INCLUDE_DEV_DEPLOY=true` copied Dev Deploy workflow, package/deploy/runtime scripts, and deployment docs
- generated deploy target excluded secrets and local-only files
- generated deploy target passed:
  - `make doc-check`
  - `make doc-guard`
  - `make release-check`

### Issues Found

- The first optional example-app trial copied generated frontend artifacts from the working tree.
- The bootstrap directory-copy helper was fixed to exclude `.git`, `.claude`, `node_modules`, `dist`, Playwright reports, test results, `.env.local`, and `*.local` when copying directories.

### Remaining Blockers

No v0.1.0 blockers remain from the fresh local bootstrap trial.

### Recommendation

Dogsquard is ready for `v0.1.0` tagging from the local bootstrap-trial perspective after this validation PR is reviewed and merged.

## Known Limitations

- Bootstrap does not fully replace project-specific names yet.
- Generated target repositories still require manual GitHub settings review.
- Labels are documented but not synchronized automatically.
- Dev deploy requires manual GitHub Environment setup.
- Public dev access remains SSH-tunnel oriented and private by default.
- The example app remains in the Dogsquard repo rather than under `examples/`.

## Release Blockers

Blockers before tagging `v0.1.0`:

- failed local release-check
- failed bootstrap validation
- accidental inclusion of local-only files
- stale or misleading Control Board
- unclear README bootstrap instructions
- secrets or raw server output in tracked files

## Post-v0.1.0 Candidates

After `v0.1.0`, possible follow-up work includes:

- placeholder replacement improvements
- optional template profiles
- generated Control Board body
- label automation
- example app relocation
- production deployment design
- public access hardening if needed

## Production Remains Future

Production deployment requires a separate design, explicit approval gate, and route strategy. It is not required for `v0.1.0`.
