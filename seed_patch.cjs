const fs = require('fs');
let code = fs.readFileSync('src/scripts/seed.ts', 'utf8');

const usersStr = `
const users = [
  { id: 'u-demo-1', name: 'Sarah L.', email: 'sarah.l@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sarah&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-2', name: 'John Doe', email: 'john.d@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=John&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-3', name: 'Pasang D.', email: 'pasang.d@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Pasang&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-4', name: 'Liam', email: 'liam@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Liam&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-5', name: 'Sophia', email: 'sophia@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sophia&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-admin', name: 'Admin User', email: 'admin@example.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
`;

if (!code.includes('const users = [')) {
  code = code.replace(/const companions = \[/, usersStr + '\nconst companions = [');
}

const seedLogic = `
  const usersRef = collection(db, 'users');
  const existingUsers = await getDocs(usersRef);
  if (existingUsers.size === 0) {
    for (const user of users) {
      await setDoc(doc(db, 'users', user.id), user);
    }
  } else {
    console.log(\`Seed skipped: \${existingUsers.size} user documents already exist.\`);
  }
`;

if (!code.includes("collection(db, 'users')")) {
  code = code.replace(/async function seed\(\) \{/, 'async function seed() {' + seedLogic);
}

fs.writeFileSync('src/scripts/seed.ts', code);
console.log('Patched seed.ts');
