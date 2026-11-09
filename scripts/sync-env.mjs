import fs from 'fs';
import dotenv from 'dotenv';

const apiEnv = dotenv.parse(fs.readFileSync('apps/api/.env'));
const rootLines = fs.readFileSync('.env', 'utf8').split('\n');

const newLines = [];
let foundAuthKey = false;
let foundServiceAccount = false;

for (const line of rootLines) {
  if (line.startsWith('GEMINI_AUTH_KEY=')) {
    newLines.push(`GEMINI_AUTH_KEY="${apiEnv.GEMINI_AUTH_KEY}"`);
    foundAuthKey = true;
  } else if (line.startsWith('GEMINI_API_KEY=')) {
    newLines.push(`GEMINI_API_KEY="${apiEnv.GEMINI_AUTH_KEY || apiEnv.GEMINI_API_KEY}"`);
  } else if (line.startsWith('GEMINI_SERVICE_ACCOUNT=')) {
    newLines.push(`GEMINI_SERVICE_ACCOUNT="${apiEnv.GEMINI_SERVICE_ACCOUNT}"`);
    foundServiceAccount = true;
  } else {
    newLines.push(line);
  }
}

if (!foundAuthKey && apiEnv.GEMINI_AUTH_KEY) {
  newLines.push(`GEMINI_AUTH_KEY="${apiEnv.GEMINI_AUTH_KEY}"`);
}
if (!foundServiceAccount && apiEnv.GEMINI_SERVICE_ACCOUNT) {
  newLines.push(`GEMINI_SERVICE_ACCOUNT="${apiEnv.GEMINI_SERVICE_ACCOUNT}"`);
}

fs.writeFileSync('.env', newLines.join('\n'));
console.log('Root .env successfully synchronized with GEMINI_AUTH_KEY and GEMINI_SERVICE_ACCOUNT');

