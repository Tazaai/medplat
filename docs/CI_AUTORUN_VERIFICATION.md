# CI Auto-run verification checklist

Drop this into PR notes or run locally to confirm the PR → merge → auto-dispatch → CI loop:

- Step 1 — quick syntax check
  - Command:
    ```bash
    ruby -ryaml -e 'YAML.load_file(".github/workflows/ci-checks.yml"); puts "✅ YAML syntax OK"'
    ```
  - Expect: prints "✅ YAML syntax OK".

- Step 2 — merge PR to `main`
  - Recommended: merge via GitHub UI or:
    ```bash
    gh pr merge <pr-number> --merge --delete-branch
    ```
  - Expect: branch deleted and commit appears on `main`.

- Step 3 — confirm `auto-ci.yml` dispatched `ci-checks.yml`
  - Command:
    ```bash
    gh run list --workflow="ci-checks.yml" --limit 5
    ```
  - Expect: a new run with ref `main` near the top and a run-id.

- Step 4 — view run logs (quick)
  - Command:
    ```bash
    gh run view <run-id> --log
    ```
  - Expect: `preflight-checks` ran; if secrets missing, there will be a preflight failure and a PR comment listing missing secrets.

- Step 5 — manual dispatch (optional)
  - Command:
    ```bash
    gh workflow run ci-checks.yml --ref main
    ```

- Step 6 — confirm frontend artifact upload
  - After `ci-checks.yml` completes, check artifacts:
    ```bash
    gh run view <run-id> --log
    ```
  - Expect: `frontend-dist` and `agent-enhanced-report` artifacts uploaded on success.

- Step 7 — validate production wiring (after secrets set)
  - Ensure repo secrets are set (esp. `BACKEND_BASE`, `VITE_API_BASE`, `OPENAI_API_KEY`, `FIREBASE_SERVICE_KEY`).
  - After CI completes and you deploy, validate the live frontend shows topics:
    ```bash
    curl -sS https://medplat-backend-139218747785.europe-west1.run.app/api/topics | jq '.topicsCount'
    ```
  - Expect: a non-zero topics count (e.g., 1107).

Notes & troubleshooting
- If `gh` commands return 403: run them with an account that has repo admin permissions or set secrets via the GitHub web UI.
- If you see duplicate runs, verify `ci-checks.yml` does not have `push:` (it should be dispatch-only) and `auto-ci.yml` is the dispatcher.
- Preflight comments on PRs will appear when required secrets are missing; the comment lists specific missing secrets (thanks to `missing_list`).

Would you like this checklist inserted anywhere else in the repo (README or PROJECT_GUIDE)?
