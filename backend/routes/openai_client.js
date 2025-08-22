// ~/medplat/backend/routes/openai_client.js
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("❌ Missing OPENAI_API_KEY env var");
}

const opts = { apiKey, defaultHeaders: {} };

// If project-scoped key, set the OpenAI-Project header
if (apiKey.startsWith("sk-proj-")) {
  if (process.env.OPENAI_PROJECT_ID) {
    opts.defaultHeaders["OpenAI-Project"] = process.env.OPENAI_PROJECT_ID;
  } else {
    // fallback: try extracting from key structure
    const parts = apiKey.split("-");
    if (parts.length >= 3) {
      opts.defaultHeaders["OpenAI-Project"] = parts[2];
      console.warn(`⚠️ Using derived project ID from key: ${parts[2]}`);
    } else {
      console.warn("⚠️ Project-scoped key detected but no project ID available.");
    }
  }
}

const openai = new OpenAI(opts);

// Safe log (only shows first part of key)
console.log("✅ OpenAI client ready, key prefix:", apiKey.slice(0, 10) + "...");

export default openai;
