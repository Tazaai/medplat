import OpenAI from "openai";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

let _openai = null;

export async function getOpenAI() {
  if (_openai) return _openai;

  let apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey && process.env.SM_OPENAI_SECRET_NAME) {
    try {
      const client = new SecretManagerServiceClient();
      const [version] = await client.accessSecretVersion({
        name: process.env.SM_OPENAI_SECRET_NAME,
      });
      apiKey = version.payload.data.toString().trim();
      console.log("OpenAI API key loaded from Secret Manager.");
    } catch (error) {
      console.error("Failed to load OpenAI API key from Secret Manager:", error);
      throw new Error("Failed to load OpenAI API key from Secret Manager.");
    }
  }

  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY missing and SM_OPENAI_SECRET_NAME not configured or failed.");
    err.status = 503;
    throw err;
  }

  _openai = new OpenAI({ apiKey });
  return _openai;
}