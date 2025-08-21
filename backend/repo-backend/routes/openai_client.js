// ~/medplat/backend/routes/openai_client.js
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("❌ Missing OPENAI_API_KEY env var");
}

const opts = { apiKey };

// If project-scoped key, ensure project field is set
if (apiKey.startsWith("sk-proj-")) {
  if (process.env.OPENAI_PROJECT_ID) {
    opts.project = process.env.OPENAI_PROJECT_ID;
  } else {
    // fallback: extract from key pattern sk-proj-<projectid>-...
    const parts = apiKey.split("-");
    if (parts.length >= 3) {
      opts.project = parts[2]; // this should be your project id
      console.warn(`⚠️ Using derived project ID from key: ${opts.project}`);
    } else {
      console.warn("⚠️ Project-scoped key detected but no project ID could be derived.");
    }
  }
}

const openai = new OpenAI(opts);

export default openai;
