// ~/medplat/backend/openai_client.js
import OpenAI from "openai";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let openai = null;

async function initializeOpenAI() {
  if (openai) return openai;

  let apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey && process.env.SM_OPENAI_SECRET_NAME) {
    try {
      const client = new SecretManagerServiceClient();
      const name = `projects/${process.env.GCP_PROJECT}/secrets/${process.env.SM_OPENAI_SECRET_NAME}/versions/latest`;
      const [version] = await client.accessSecretVersion({ name });
      apiKey = version.payload.data.toString("utf8");
      console.log("Successfully loaded OpenAI key from Secret Manager.");
    } catch (error) {
      console.error("Failed to load OpenAI key from Secret Manager:", error);
      throw new Error("Could not initialize OpenAI client: key not found in environment or Secret Manager.");
    }
  }

  if (!apiKey) {
    console.error("OPENAI_API_KEY is not set and SM_OPENAI_SECRET_NAME is not defined.");
    throw new Error("OpenAI API key is not configured.");
  }

  openai = new OpenAI({ apiKey });
  return openai;
}

export default async (req, res, next) => {
  try {
    req.openai = await initializeOpenAI();
    next();
  } catch (error) {
    res.status(503).json({ ok: false, error: "OpenAI client not available" });
  }
};

export { initializeOpenAI };