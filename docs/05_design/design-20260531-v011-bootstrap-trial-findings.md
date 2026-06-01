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

Record the Dogsquard `PROJECT_TYPE=node` bootstrap trial against the `dogpdteamreport-dogsquard-trial` repository.

## Source Template

- Dogsquard source: `proletariat64/dogsquard`
- Dogsquard commit used: `030ad66 chore: add profile-aware bootstrap script (#29)`
- Bootstrap script: `scripts/bootstrap-project.sh`
- Trial profile: `PROJECT_TYPE=node`

## Trial Target

- Trial repo: `proletariat64/dogpdteamreport-dogsquard-trial`
- Branch: `test/v011-bootstrap-trial`
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
- Dev deploy assets were not planned by default.
- cn.ant high-port access files were not planned by default.

## Real Apply Result

Real apply completed safely with `DRY_RUN=false`.

Because the trial repo already contained the prior Dogsquard governance adoption, bootstrap preserved existing files and did not produce destructive changes.

## Files Generated

No new bootstrap files were generated during this rerun because existing governance files were already present and `FORCE=false`.

## Files Skipped

Bootstrap skipped existing governance and profile files, including:

- `README.md`
- `CHANGELOG.md`
- `Makefile`
- `.github/ISSUE_TEMPLATE/*`
- `.github/pull_request_template.md`
- `.github/workflows/pr-quality.yml`
- `docs/`
- `scripts/doc-check-local.sh`
- `scripts/doc-guard.sh`
- `scripts/agent-doc-review.sh`
- `data/.gitkeep`

Bootstrap also skipped:

- Dogsquard example app
- dev deploy workflow and scripts
- cn.ant high-port access defaults

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

Final validation passed:

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

No manual CI adaptation was needed for the already generated Node PR Quality Gate.

## Policy Compliance

Matched Dogsquard policy:

- `PROJECT_TYPE=node` preserved existing project files.
- Node Makefile behavior worked for local validation.
- Node PR Quality Gate remained project-appropriate.
- Dogsquard example app remained optional and was not copied.
- Local/private agent files were not copied.
- No production, `us.hermes`, public route, secret, or raw log behavior was introduced.

Did not match current Dogsquard Control Board policy:

- Dev deploy is expected to be default content for applicable profiles, but Dogsquard `origin/main` still defaults `INCLUDE_DEV_DEPLOY=false`.
- cn.ant high-port access is expected to be immediately supported, but Dogsquard `origin/main` did not generate defaults for frontend `8173` or backend `8180`.
- Existing `.gitignore` preserved `.claude/`, but did not include `AGENTS.md`, `CLAUDE.md`, or `roster.md`.
- Generated Node Makefile behavior passes validation, but optional npm script detection can still print npm lifecycle noise in the Dogsquard `origin/main` implementation.

## Remaining Dogsquard v0.1.1 Gaps

Remaining gaps are in Dogsquard, not in this trial repo:

- make dev deploy default for `PROJECT_TYPE=node` and `PROJECT_TYPE=go-js`
- keep `PROJECT_TYPE=docs-only` deploy-free by default
- generate cn.ant high-port dev defaults for `8173` and `8180`
- append local/private agent ignores to existing `.gitignore`
- quiet optional npm script detection in generated Node Makefile

Dogsquard PR #30 is the expected fix path for these gaps.

## Recommendation

Do not tag Dogsquard `v0.1.1` from current `origin/main` yet.

Recommended next step:

1. Merge the Dogsquard v0.1.1 bootstrap policy fix PR if review and PR Quality Gate pass.
2. Treat this trial as confirmation that the Node governance path works.
3. Use the fixed Dogsquard bootstrap behavior as the `v0.1.1` release candidate.
