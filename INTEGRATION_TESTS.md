# Integration tests (manual, protected)

We provide a manual integration workflow to run real OpenAI and Firebase tests.

Location
- `.github/workflows/integration-tests.yml` (trigger: Workflow Dispatch)

Purpose
- Run real API calls against OpenAI and Firestore to validate credentials and end-to-end behavior.

Safety
- The job is configured to use the `integration-tests` GitHub environment. Configure that environment in repository Settings → Environments and require reviewer approvals before the workflow can access secrets.

How to run (recommended)
1. Add required repository Secrets: `OPENAI_API_KEY`, `GCP_PROJECT`, `GCP_SA_KEY`, `FIREBASE_SERVICE_KEY`.
2. In GitHub Actions, open the 'Integration tests (manual)' workflow and click Run workflow.
3. A reviewer approval will be required if you enabled environment protection. After approval the job will store secrets in Secret Manager and run the tests.

Notes
- These tests perform real API calls and may incur usage costs. Use them sparingly and only with credentials you control.
- The repository also contains local no-op fallbacks so developers can run unit/smoke tests without secrets (`backend/firebaseClient.js`, `backend/openaiClient.js`).
