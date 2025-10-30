# MedPlat — quick developer guide

Workflows (badges)

- Backend tests: ![backend-tests](https://github.com/Tazaai/medplat/actions/workflows/backend-tests.yml/badge.svg)
- PR checks: ![pr-checks](https://github.com/Tazaai/medplat/actions/workflows/pr-checks.yml/badge.svg)

Mandatory process (short)

1. Run local smoke & unit checks: `./scripts/run_local_checks.sh` (uses `.env.local` or environment variables).
2. Do not commit secrets or service account JSON files. Ensure `.env.local` is in `.gitignore`.
3. Include `agent.md` output from `review_report.sh` in PR descriptions for reviewer traceability.

For more details see `.github/copilot-instructions.md` and `PROJECT_GUIDE.md`.
