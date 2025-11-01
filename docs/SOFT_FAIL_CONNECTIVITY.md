# SOFT_FAIL_CONNECTIVITY — Ops note

Purpose: brief operational guidance for the `SOFT_FAIL_CONNECTIVITY` toggle used by CI deploy connectivity checks.

Why
---
Cloud Run services sometimes experience transient regional latency that can cause post-deploy connectivity checks to fail intermittently. The `SOFT_FAIL_CONNECTIVITY` toggle lets operators temporarily avoid failing a deploy while still surfacing warnings in CI logs and artifacts.

How it works
---
- Name: `SOFT_FAIL_CONNECTIVITY`
- Type: boolean-like string (`true` / `false`)
- Default: not set (treated as `false`)

Behavior
---
- When **unset** or `false`: connectivity checks (GET `/api/topics`, POST `/api/dialog`) will retry (3 attempts with exponential backoff and jitter) and *fail the deploy* if endpoints remain unreachable.
- When set to `true`: the same checks run and are retried, but persistent failures will be reported as warnings and will *not* cause the deploy job to fail. Artifacts and logs will still show the failure detail for investigation.

When to use
---
- Temporary mitigation for canary or rolling deploys across regions where you expect short-lived DNS/latency issues.
- When performing maintenance that may briefly disrupt endpoint availability.

When NOT to use
---
- Do NOT enable for production-critical deploys. Leave unset so CI fails fast on genuine outages.
- Do NOT use as a permanent workaround for flaky endpoints; instead investigate root causes.

How to enable
---
- Manual run (Actions UI): when dispatching the workflow, set the input or environment variable `SOFT_FAIL_CONNECTIVITY=true`.
- Workflow override: temporarily set the job or step environment variable in the workflow YAML (not recommended for long term):

```yaml
env:
  SOFT_FAIL_CONNECTIVITY: 'true'
```

Notes & recommendations
---
- Prefer increasing retry counts or adding jitter before enabling soft-fail.
- Keep the soft-fail usage documented in PRs when used (so reviewers know why a deploy didn't fail despite connectivity warnings).
- The connectivity checks still upload logs and enhanced diagnostics (`agent_enhanced_*.md`) so failures are preserved for auditing.
