import fs from "fs";
import { execSync } from "child_process";

const prompts = JSON.parse(fs.readFileSync("prompts.json", "utf8"));

for (const prompt of prompts) {
  const escapedPrompt = prompt.replace(/"/g, '\"');
  console.log("\n🚀 Genererer case:", prompt);
  execSync(`node generate_cases.mjs "${escapedPrompt}"`, { stdio: "inherit" });
}
