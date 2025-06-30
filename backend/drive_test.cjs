const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];
const TOKEN_PATH = './drive-token.json';

const auth = new google.auth.OAuth2();
const creds = require('../drive-oauth.json');

auth._clientId = creds.installed.client_id;
auth._clientSecret = creds.installed.client_secret;
auth.redirectUri = 'urn:ietf:wg:oauth:2.0:oob';

const getAccessToken = () => {
  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('🌐 Åbn dette link og login:');
  console.log(authUrl);
  require('child_process').exec(`xdg-open "${authUrl}"`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('\n📥 Indsæt koden her: ', (code) => {
    rl.close();
    auth.getToken(code, (err, token) => {
      if (err) return console.error('❌ Error:', err);
      auth.setCredentials(token);
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
      console.log('✅ Token gemt til', TOKEN_PATH);
      listFiles(auth);
    });
  });
};

const listFiles = async (auth) => {
  const drive = google.drive({ version: 'v3', auth });
  const res = await drive.files.list({
    pageSize: 10,
    fields: 'files(id, name)',
    q: "mimeType='application/vnd.google-apps.document'"
  });
  console.log('\n📄 Google Docs i din Drive:');
  res.data.files.forEach((file) => {
    console.log(`- ${file.name} (${file.id})`);
  });
};

fs.existsSync(TOKEN_PATH) ? listFiles(auth) : getAccessToken();
