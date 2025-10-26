## Summary

Provide a short description of the change and why it is needed.

## Pre-work checklist (mandatory)
Before opening or updating this PR, ensure the following have been completed and include the output when requested by reviewers.

- [ ] I have read `PROJECT_GUIDE.md` and `MANDATORY_PROCESS.md`.
- [ ] I ran `bash review_report.sh` and addressed or documented all warnings/errors. (attach `agent.md` or paste relevant snippets when requested)
- [ ] I ran `bash test_backend_local.sh` and verified the relevant endpoints/tests pass locally.
- [ ] I did not commit secrets; `.env.local` is generated locally via `scripts/generate_env_local.sh` if needed.

## Change checklist
- [ ] Small, focused change (prefer < 300 LOC) or broken into incremental PRs
- [ ] Tests added or updated (unit/integration)
- [ ] Any temporary stubs are clearly marked with a TODO and linked to a follow-up issue/PR

## How to test locally
Include steps to run the project and verify the behavior locally. Example:

```bash
bash review_report.sh
bash test_backend_local.sh
```

## Notes
Add any additional context, links to issues, or rationale for reviewers.
