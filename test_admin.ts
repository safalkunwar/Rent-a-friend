import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize firebase-admin with hamrosathi1 project context
initializeApp({
  projectId: 'hamrosathi1'
});

const db = getFirestore();

async function testAdmin() {
  console.log('Testing read from community_posts with Admin SDK...');
  try {
    const colRef = db.collection('community_posts');
    const snap = await colRef.get();
    console.log('Success! Total community posts in DB:', snap.size);
    snap.forEach(doc => {
      console.log(`Post ID: ${doc.id} =>`, doc.data());
    });
  } catch (error) {
    console.error('Error with firebase-admin:', error);
  }
}

testAdmin();
