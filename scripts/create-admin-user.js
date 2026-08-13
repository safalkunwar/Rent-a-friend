const FIREBASE_API_KEY = 'AIzaSyBE-RD9iszOTqSLuugWxuYCpIWIrPVIjsI';

async function createUser() {
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@sathi.com',
        password: 'Password123!',
        displayName: 'SATHI Admin',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }
    
    console.log('✅ User created successfully!');
    console.log('UID:', data.localId);
    console.log('Email:', data.email);
    console.log('ID Token:', data.idToken);
  } catch (err) {
    console.error('❌ Failed to create user:', err.message || err);
  }
}

createUser();
