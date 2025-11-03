# Proposal: WIF-only deploy workflow (draft)

Summary
-------
This draft PR proposes making Workload Identity Federation (WIF) the required authentication method for the `deploy.yml` workflow. It removes the fallback to a service-account JSON stored in `GCP_SA_KEY` and replaces it with clear instructions for admins to configure WIF. The aim is to improve security (no long-lived JSON in Secrets), simplify rotation, and enforce a safer CI posture.

Why a draft?
-----------
- Removing the SA-key path is a breaking change for teams that rely on SA JSON. This document is a proposal and should be reviewed by admins.
- If accepted, maintainers can apply the included patch file (`ci/wif_proposal.patch`) which shows the exact minimal patch to `deploy.yml`.

What the patch does (high level)
--------------------------------
- Validates that `WORKLOAD_IDENTITY_PROVIDER` and `WORKLOAD_IDENTITY_SERVICE_ACCOUNT` are present and fails early otherwise.
- Removes the service-account JSON `GCP_SA_KEY` branch from the workflow.

How to test this safely
-----------------------
1. Create a test GCP project or a temporary service account + workload identity provider.
2. Set the two secrets in this repo: `WORKLOAD_IDENTITY_PROVIDER` and `WORKLOAD_IDENTITY_SERVICE_ACCOUNT`.
3. Run the workflow manually via Actions → Run workflow (or `gh workflow run deploy.yml --ref ci/wif-only-proposal`).

Files in this PR
----------------
- `ci/wif_proposal.patch` — minimal patch to apply to `.github/workflows/deploy.yml`.
- `ci/WIF_PROPOSAL.md` — this file.

If you'd like, I can open this draft PR now. It will be non-blocking and safe for discussion. Once admins approve, they can either merge or apply the patch manually.
