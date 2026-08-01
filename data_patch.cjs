const fs = require('fs');
let code = fs.readFileSync('src/data.ts', 'utf8');

const usersStr = `
export const USERS = [
  { id: 'u-demo-1', name: 'Sarah L.', email: 'sarah.l@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sarah&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-2', name: 'John Doe', email: 'john.d@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=John&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-3', name: 'Pasang D.', email: 'pasang.d@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Pasang&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-4', name: 'Liam', email: 'liam@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Liam&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-5', name: 'Sophia', email: 'sophia@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sophia&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-admin', name: 'Admin User', email: 'admin@example.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
`;

if (!code.includes('export const USERS')) {
  code += '\n' + usersStr;
}

fs.writeFileSync('src/data.ts', code);
console.log('Patched data.ts');
