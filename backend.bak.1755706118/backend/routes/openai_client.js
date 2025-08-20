import OpenAI from "openai";

// ✅ Direct API key injection (for dev/testing only)
const openai = new OpenAI({
  apiKey: "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"
});

export default openai;
