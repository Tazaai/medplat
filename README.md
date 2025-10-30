# MedPlat — quick developer guide

Workflows (badges)

- Backend tests: ![backend-tests](https://github.com/Tazaai/medplat/actions/workflows/backend-tests.yml/badge.svg)
- PR checks: ![pr-checks](https://github.com/Tazaai/medplat/actions/workflows/pr-checks.yml/badge.svg)

Mandatory process (short)

1. Run local smoke & unit checks: `./scripts/run_local_checks.sh` (uses `.env.local` or environment variables).
2. Do not commit secrets or service account JSON files. Ensure `.env.local` is in `.gitignore`.
3. Include `agent.md` output from `review_report.sh` in PR descriptions for reviewer traceability.

For more details see `.github/copilot-instructions.md` and `PROJECT_GUIDE.md`.

PROJECT_GUIDE edit policy
-------------------------

Edits to `PROJECT_GUIDE.md` are treated as privileged and require explicit approval from the project lead. To modify `PROJECT_GUIDE.md`:

- Option A (label): Add the PR label `project-guide-edit` once you have received approval from the project lead.
- Option B (quick approve): The project lead may approve directly in the PR by posting a comment with the exact text `PG-approve` (this must be posted by the project lead's GitHub account).

If a PR modifies `PROJECT_GUIDE.md` without either the label or the `PG-approve` comment, an automated check will post a request for approval and the PR will be blocked until approval is granted.

