## MedPlat Mandatory Development Process

Purpose
-------
This document defines the mandatory, non-bypassable process every contributor (human or Copilot/agent) must follow before starting work on any code, configuration, or CI change. The goal is to ensure permanent, well-reviewed solutions and avoid ad-hoc, risky shortcuts.

Scope
-----
- Applies to all changes in this repository (backend, frontend, CI/workflows, scripts).
- Applies to human developers, automated agents, and Copilot-style assistants.

Core Rules (must be followed every time)
-------------------------------------
1. Read the canonical project guide: open and review `PROJECT_GUIDE.md`. This file is the master source of architecture, conventions, and deployment rules.
2. Run the project's readiness script: execute `bash review_report.sh` and inspect the generated `agent.md` (or terminal output). Address any blocking problems reported there before proceeding.
3. Run local tests: execute `bash test_backend_local.sh` (and frontend build if applicable). All local checks must pass for the components you will change.
4. Do not bypass or skip steps by editing scripts or the CI workflow to disable checks. Any temporary bypass must be explicitly approved by a project owner and documented in the PR description with roll-back instructions.

Minimal pre-work checklist (copy into your PR description)
--------------------------------------------------------
- [ ] I have read `PROJECT_GUIDE.md` and understood the system components I will touch.
- [ ] I ran `bash review_report.sh` and addressed or documented all warnings/errors from `agent.md`.
- [ ] I ran `bash test_backend_local.sh` and verified the endpoints/tests relevant to my change pass locally.
- [ ] I have ensured `.env.local` and any runtime secrets are not committed and follow the repo's secrets pattern.
- [ ] The change is scoped to a small, reviewable PR (prefer < 300 LOC). If larger, break it into incremental PRs.

Pull Request Requirements
-------------------------
- Branch naming: `feature/<short-desc>` or `fix/<short-desc>`.
- Each PR must include the pre-work checklist above (copy it into the PR body and check boxes).
- Attach `agent.md` (or paste the relevant snippet) showing `review_report.sh` output when requested by reviewers.
- Tests: include or update unit/integration tests. CI must run `bash review_report.sh` and the backend tests before deploy.
- Review: at least one approving review from a project maintainer is required. For infra/CI/security changes, two maintainers should approve.
- Merge strategy: use squash-and-merge for feature branches unless the maintainer requests otherwise.

Secrets and Credentials
-----------------------
- Never commit secrets to the repository. Use `scripts/generate_env_local.sh` locally to create `.env.local` from your environment variables.
- CI: use GitHub Secrets and Secret Manager integration as defined in `.github/workflows/deploy.yml`. Do not add secrets to workflow YAML or commit service account JSONs.

Code Quality and Permanence
--------------------------
- Prefer permanent, maintainable solutions over quick hacks. If adding a temporary stub, clearly mark it with a TODO comment pointing to the issue or PR that will replace it.
- Add tests and comments for any behavioral assumptions.
- Keep changes small and reversible. If a larger refactor is necessary, propose a phased plan and split work into multiple PRs.

CI / Enforcement
----------------
- The main branch is protected: CI must run and pass `bash review_report.sh`, lint/build steps, and tests before allowing merges.
- Any PR that disables checks requires an override label and at least two maintainers' approval. This should be rare and temporary.

Exception / Emergency Fixes
---------------------------
- Emergency fixes are allowed only when a service outage or critical security issue is present.
- Emergency process:
  1. Create a small PR with the minimal fix.
  2. Tag two maintainers and include an explanation and rollback plan in the PR body.
  3. After deployment, follow up with a proper PR that reintroduces the change through the normal process and adds tests.

Reviewer Quick Checklist (for maintainers)
-----------------------------------------
- Does the PR include the mandatory pre-work checklist and `agent.md` output?
- Are any stubs or temporary bypasses clearly marked and linked to a follow-up issue/PR?
- Do tests cover the change or is there a clear plan for tests?
- Are secrets and environment changes handled via the repo's standard scripts and CI patterns?

Appendix — Essential commands
-----------------------------
Run readiness and local backend tests:

```bash
bash review_report.sh    # generate agent.md and check readiness
bash test_backend_local.sh
```

Create `.env.local` from environment (local):

```bash
scripts/generate_env_local.sh  # safe generator that reads env vars and writes .env.local
```

If you are an automated agent (Copilot/AI assistant)
--------------------------------------------------
- Always surface this document to the human reviewer before making any change.
- Do not edit code or push branches unless the human confirms the pre-work checklist has been run and the maintainer approves proceeding.

Contact and escalation
----------------------
If unclear about process or you need an exception, tag `@maintainers` in the PR and include `PROCESS-EXCEPTION` in the title. Maintain a record of the exception and follow up within 48 hours to remove any temporary bypass.

Versioning
----------
This file is the single-source for the mandatory process. Changes to it require a PR that follows this process itself.

---
Last updated: 2025-10-26
