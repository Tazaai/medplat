import { generateCase } from "./generate_case_openai.mjs";

// Example test prompt
const prompt = "A 35-year-old man presents with fever and cough for 3 days. He reports shortness of breath and chest pain.";

generateCase(prompt).then(result => {
  console.log("History:", result.history);
  console.log("Objectives:", result.objectives);
}).catch(err => {
  console.error("Error:", err);
});
