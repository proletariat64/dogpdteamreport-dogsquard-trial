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

## Trial Scope

This trial validates Dogsquard `PROJECT_TYPE=node` bootstrap against the `dogpdteamreport-dogsquard-trial` repository.

Source template repo: <https://github.com/proletariat64/dogsquard>

Trial repo: <https://github.com/proletariat64/dogpdteamreport-dogsquard-trial>

Dogsquard commit used:

```text
030ad66 chore: add profile-aware bootstrap script (#29)
```

## Dry-run Result

Command:

```bash
PROJECT_TYPE=node \
TARGET_DIR=/home/daishun/dev/dogpdteamreport-dogsquard-trial \
DRY_RUN=true \
INCLUDE_EXAMPLE_APP=false \
/home/daishun/dev/dogsquard/scripts/bootstrap-project.sh
```

Result:

- Dry-run completed without writing files.
- Existing `README.md` was skipped.
- Existing `.gitignore` was skipped.
- Dogsquard docs governance folders were planned.
- Core governance docs were planned.
- Documentation scripts were planned.
- GitHub issue and PR templates were planned.
- Node Makefile was planned.
- Node PR Quality Gate workflow was planned.
- `data/.gitkeep` was planned because Node runtime data signals were present.
- Dogsquard example app was skipped because `INCLUDE_EXAMPLE_APP=false`.
- Dev deploy assets were skipped by default.

## Real Apply Result

Command:

```bash
PROJECT_TYPE=node \
TARGET_DIR=/home/daishun/dev/dogpdteamreport-dogsquard-trial \
DRY_RUN=false \
INCLUDE_EXAMPLE_APP=false \
/home/daishun/dev/dogsquard/scripts/bootstrap-project.sh
```

Result:

- Real apply completed.
- Existing project files were preserved.
- Node Makefile was generated.
- Node PR Quality Gate workflow was generated.
- Dogsquard docs governance structure was added.
- Dogsquard issue and PR templates were added.
- `data/.gitkeep` was added.
- Dogsquard `backend/` and `frontend/` example app directories were not copied.
- Dev deploy workflow and deploy scripts were not copied.

## Files Generated

- `.github/ISSUE_TEMPLATE/bug.yml`
- `.github/ISSUE_TEMPLATE/feature.yml`
- `.github/ISSUE_TEMPLATE/task.yml`
- `.github/pull_request_template.md`
- `.github/workflows/pr-quality.yml`
- `CHANGELOG.md`
- `Makefile`
- `data/.gitkeep`
- `docs/00_inbox/.gitkeep`
- `docs/01_brd/brd-20260530-project-operating-model.md`
- `docs/02_prd/prd-20260530-document-governance.md`
- `docs/03_bdd/bdd-20260530-document-governance.md`
- `docs/04_adr/0001-use-github-actions-as-ci-authority.md`
- `docs/05_design/design-20260530-agent-charter.md`
- `scripts/agent-doc-review.sh`
- `scripts/doc-check-local.sh`
- `scripts/doc-guard.sh`
- `scripts/lib-doc-rules.sh`

## Files Skipped or Preserved

- Existing `README.md` preserved.
- Existing `.gitignore` preserved by bootstrap, then manually extended for local/private agent files.
- Existing `ddd/` preserved.
- Existing `spec/` was not present on this branch; existing `docs/`, `test/`, `src/`, and `www/` were preserved.
- Existing `package.json` and `package-lock.json` preserved.
- Existing source and tests preserved.
- Dogsquard example app skipped.
- Dogsquard dev deploy workflow skipped by default.
- Local/private agent files were not copied.

## Validation Results

Validation passed after trial-local app test fixes:

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

Trial-local fixes needed:

- Excluded legacy SSH UAT e2e tests targeting `ifundaitest` from default Vitest.
- Updated tests that asserted historical bug behavior to assert current behavior.
- Relaxed backup tests so they do not require unavailable runtime backup state.
- Added front matter to existing project docs under `docs/`.
- Added `.gitignore` entries for `AGENTS.md`, `CLAUDE.md`, and `roster.md`.

## Makefile and CI Adaptation

Manual Makefile adaptation was not needed for this Node project. The generated Node Makefile worked after app-local tests were corrected.

The generated Makefile did emit npm lifecycle noise while probing for missing scripts with `npm run | grep -q`, but the command exited successfully. This is not a blocking trial issue, but it is a Dogsquard polish candidate for quieter script detection.

Manual CI adaptation was not needed for basic Node quality shape, but the generated workflow has policy gaps listed below.

## Policy Checks

### Dev Deploy Default Policy

Expected policy:

- Dev deploy should be default expected content for applicable Dogsquard bootstrap profiles.

Observed implementation:

- `scripts/bootstrap-project.sh` still keeps dev deploy assets behind `INCLUDE_DEV_DEPLOY=true`.
- Running with default settings does not generate deploy scripts, deploy workflow, or deploy docs.

Result:

- Gap for Dogsquard `v0.1.1`.

### cn.ant High-port Immediate Support

Expected policy:

- Bootstrap output should support `cn.ant` high-port access immediately.
- Firewall-allowed high ports are `8000-8999`.

Observed implementation:

- Node bootstrap output does not generate high-port dev access settings, scripts, or docs.
- No cn.ant high-port defaults are emitted.

Result:

- Gap for Dogsquard `v0.1.1`.

### Agent-local Files

Expected policy:

- `AGENTS.md`, `CLAUDE.md`, and `roster.md` should remain local/private by default.

Observed implementation:

- Bootstrap did not copy those files.
- Existing `.gitignore` was preserved, so manual `.gitignore` additions were needed in this trial.

Result:

- Partial pass with a Dogsquard `v0.1.1` improvement recommended: add local/private agent-file ignore entries even when preserving an existing `.gitignore`.

### Example App Optional

Expected policy:

- Dogsquard example app should stay optional.

Observed implementation:

- `backend/` and `frontend/` were not copied with `INCLUDE_EXAMPLE_APP=false`.

Result:

- Pass.

## Remaining Dogsquard v0.1.1 Fixes

- Make dev deploy default for applicable profiles or explicitly align the Control Board policy with opt-in behavior.
- Generate cn.ant high-port dev access support for Node bootstrap output.
- Add safe `.gitignore` merge behavior for local/private agent files when target repos already have `.gitignore`.
- Make generated Node Makefile script detection quieter when optional npm scripts such as `lint` are missing.
- Consider generating project-specific adoption docs for existing Node repos, not only generic Dogsquard governance docs.

## Recommendation

Dogsquard `PROJECT_TYPE=node` bootstrap is strong enough for governance and Node Makefile/CI foundation, but it is not yet fully aligned with the updated v0.1.1 policy because dev deploy and cn.ant high-port support are not default in bootstrap output.

Recommendation:

- Do not tag `v0.1.1` until the dev deploy default and cn.ant high-port support gaps are resolved or the Control Board policy is revised.
