// ~/medplat/frontend/src/config.js
const API_BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:8080"
    : "https://medplat-backend-139218747785.europe-west1.run.app";

export { API_BASE };
