import { readFileSync } from 'fs';

const FIREBASE_API_KEY = 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI';
const FIREBASE_PROJECT_ID = 'hamrosathi1';
const UID = 'pJU9vjtjMZhzjp0Tp04RqKOTDwx1';

async function getAccessToken() {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const configPath = `${homeDir}/.config/configstore/firebase-tools.json`;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  return config?.tokens?.access_token;
}

async function setCustomClaims() {
  try {
    const accessToken = await getAccessToken();
    
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/accounts:update?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        localId: UID,
        customAttributes: JSON.stringify({ admin: true, adminRole: 'SUPER_ADMIN' }),
      }),
    });
    
    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
  } catch (err) {
    console.error('❌ Failed:', err.message || err);
  }
}

setCustomClaims();
