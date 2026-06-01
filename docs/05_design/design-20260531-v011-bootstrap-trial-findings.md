---
title: "v0.1.1 Bootstrap Trial Findings"
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

# v0.1.1 Bootstrap Trial Findings

## Purpose

Record the Dogsquard `PROJECT_TYPE=node` bootstrap policy validation against the `dogpdteamreport-dogsquard-trial` repository after Dogsquard PR #30.

## Source Template

- Dogsquard source: `proletariat64/dogsquard`
- Dogsquard PR #30 status: merged
- Dogsquard commit used: `05baf31 fix: align bootstrap with v0.1.1 policy`
- Bootstrap script: `scripts/bootstrap-project.sh`
- Trial profile: `PROJECT_TYPE=node`

## Trial Target

- Trial repo: `proletariat64/dogpdteamreport-dogsquard-trial`
- Branch: `test/v011-bootstrap-policy-validation`
- Original source repo: `proletariat64/dogpdteamreport`
- Original source repo was not modified.

## Dry-run Result

Dry-run completed safely.

Observed behavior:

- Existing `README.md` was preserved.
- Existing `ddd/` and `spec/` project documentation were preserved.
- Existing source, tests, and package files were preserved.
- Existing Dogsquard governance files were skipped rather than overwritten.
- Existing `Makefile` and PR Quality Gate workflow were skipped rather than overwritten.
- Dogsquard example app was not copied.
- Local/private agent files were not copied.
- Dev deploy assets were planned by default for `PROJECT_TYPE=node`.
- cn.ant high-port access defaults were planned.
- Existing `.gitignore` was preserved and missing agent-local ignore entries were planned for append.

## Real Apply Result

Real apply completed safely with `DRY_RUN=false`.

Because the trial repo already contained the prior Dogsquard governance adoption, bootstrap preserved existing governance and project files while adding the v0.1.1 policy assets.

## Files Generated

Bootstrap generated:

- `.env.dogsquard-dev.example`
- `.github/workflows/deploy-dev.yml`
- `docs/07_runbooks/runbook-dev-high-port-access.md`
- `scripts/deploy-dev.sh`
- `scripts/package-release.sh`
- `scripts/remote-deploy.sh`
- `scripts/remote-runtime.sh`
- `scripts/runtime-dev.sh`
- `scripts/server-preflight.sh`

Bootstrap also appended missing local/private agent file ignore entries to `.gitignore`.

## Files Skipped

Bootstrap skipped existing governance and profile files, including:

- `README.md`
- `CHANGELOG.md`
- `Makefile`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`
- `.github/workflows/pr-quality.yml`
- existing `docs/`
- existing local governance scripts
- `data/.gitkeep`

Bootstrap also skipped the Dogsquard example app because `INCLUDE_EXAMPLE_APP=false`.

## Files Preserved

The trial preserved:

- existing `README.md`
- existing `ddd/`
- existing `spec/`
- application source files
- application tests
- `package.json`
- package lockfile
- existing Dogsquard governance files

## Validation Results

Final local validation passed:

- `npm ci`
- `npm test`
- `npm run build`
- `make help`
- `make doc-check`
- `make doc-guard`
- `make test`
- `make lint`
- `make release-check`
- `git diff --check`
- `bash -n scripts/*.sh`

The Node test suite passed with 264 tests.

## Manual Adaptation

No manual Makefile adaptation was needed for basic Node validation.

No manual CI adaptation was needed for the Node PR Quality Gate.

## Policy Compliance

Matched Dogsquard policy:

- `PROJECT_TYPE=node` preserved existing project files.
- Dev deploy is default for `PROJECT_TYPE=node`.
- cn.ant high-port defaults were generated:
  - frontend public/dev candidate port `8173`
  - backend public/dev candidate port `8180`
- `.gitignore` includes:
  - `.claude/`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `roster.md`
- Node Makefile behavior worked for local validation.
- Node PR Quality Gate remained project-appropriate.
- Dogsquard example app remained optional and was not copied.
- No production, `us.hermes`, public production route, secret, or raw log behavior was introduced.

## Remaining Dogsquard v0.1.1 Gaps

No remaining v0.1.1 bootstrap policy gaps were found in this trial.

Production design and implementation remain separate future work. Production implementation still requires explicit approval.

## Recommendation

Proceed to Dogsquard `v0.1.1` Release Candidate.
