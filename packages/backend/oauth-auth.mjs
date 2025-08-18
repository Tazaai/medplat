import fs from "fs";
import readline from "readline";
import { OAuth2Client } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive.readonly"
];

const TOKEN_PATH = "oauth-token.json";
const CREDENTIALS_PATH = "oauth-credentials.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8")).installed;
  const oAuth2Client = new OAuth2Client(
    credentials.client_id,
    credentials.client_secret,
    "urn:ietf:wg:oauth:2.0:oob"
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });

  console.log("🔗 Gå til dette link i din browser og log ind:");
  console.log(authUrl);
  const code = await askQuestion("\n👉 Indtast autorisationskoden her: ");
  rl.close();

  const { tokens } = await oAuth2Client.getToken(code.trim());
  oAuth2Client.setCredentials(tokens);
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
  console.log("✅ OAuth-token gemt som oauth-token.json");
}

authorize();
