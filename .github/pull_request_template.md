### Summary
Describe the high-level change in one sentence.

### Checklist (mandatory)
- [ ] I ran `./scripts/run_local_checks.sh` (or `node ./scripts/run_with_env.js .env.local`) and attached `agent.md` output to this PR description.
- [ ] No secrets or service account JSONs are committed. `.env.local` is ignored and not included.
- [ ] Added or updated tests for any new behavior (`backend/test/` for backend changes).
- [ ] Changes are small, focused, and include a fallback for missing third-party integrations (see `backend/firebaseClient.js` and `backend/openaiClient.js`).
- [ ] This change follows the mandatory process in `.github/copilot-instructions.md`.

### What I changed
- Files changed: list / short description

### How to test locally
1. Copy `.env.local.example` to `.env.local` and fill secrets OR export env vars in your shell.
2. Run `./scripts/run_local_checks.sh`.
3. Run any new unit tests under `backend/test/`.

Paste `agent.md` output below:

```
(paste agent.md here)
```
