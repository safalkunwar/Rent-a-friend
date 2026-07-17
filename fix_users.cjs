const fs = require('fs');

const usersStrData = `
export const USERS = [
  { id: 'u-demo-1', name: 'Emma', email: 'emma@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Emma&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-2', name: 'Raj', email: 'raj@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Raj&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-3', name: 'Chloe', email: 'chloe@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Chloe&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-4', name: 'Liam', email: 'liam@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Liam&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-5', name: 'Sophia', email: 'sophia@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sophia&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-admin', name: 'Admin', email: 'admin@sathi.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
`;

const usersStrSeed = `
const users = [
  { id: 'u-demo-1', name: 'Emma', email: 'emma@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Emma&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-2', name: 'Raj', email: 'raj@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Raj&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-3', name: 'Chloe', email: 'chloe@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Chloe&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-4', name: 'Liam', email: 'liam@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Liam&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-5', name: 'Sophia', email: 'sophia@example.com', role: 'customer', avatar: 'https://ui-avatars.com/api/?name=Sophia&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'u-demo-admin', name: 'Admin', email: 'admin@sathi.com', role: 'admin', avatar: 'https://ui-avatars.com/api/?name=Admin&background=random', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];
`;

let data = fs.readFileSync('src/data.ts', 'utf8');
data = data.replace(/export const USERS = \[\s*\{ id: 'u-demo-1'[\s\S]*?\];/, usersStrData.trim());
fs.writeFileSync('src/data.ts', data);

let seed = fs.readFileSync('src/scripts/seed.ts', 'utf8');
seed = seed.replace(/const users = \[\s*\{ id: 'u-demo-1'[\s\S]*?\];/, usersStrSeed.trim());
fs.writeFileSync('src/scripts/seed.ts', seed);

console.log('Fixed users in both files.');
