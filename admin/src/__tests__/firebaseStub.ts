// Test-only module alias: dynamic imports must never initialize the live project.
export const app = null;
export const auth = { currentUser: null };
export const db = null;
export const storage = null;
export const messaging = null;
export const firebaseConfig = {};
