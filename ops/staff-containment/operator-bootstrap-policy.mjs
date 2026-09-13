export function selectOperatorAccount(operatorEmail, accounts, complete) {
  if (!complete) throw new Error('Incomplete account inventory; no role change is safe.');
  if (typeof operatorEmail !== 'string' || !operatorEmail.trim()) throw new Error('No authenticated operator identity.');
  const email = operatorEmail.trim().toLowerCase();
  const matches = accounts.filter(account => account.email?.trim().toLowerCase() === email);
  if (matches.length !== 1) throw new Error('Expected exactly one app account matching the authenticated operator.');
  const selected = matches[0];
  if (!selected.uid || !selected.emailVerified || selected.disabled) throw new Error('Operator account must be verified and enabled.');
  return selected;
}

export function bootstrapClaims(existing = {}) {
  if (!existing || typeof existing !== 'object' || Array.isArray(existing)) throw new Error('Malformed existing claims.');
  const next = { ...existing, adminRole: 'super_admin' };
  if (Buffer.byteLength(JSON.stringify(next), 'utf8') > 1000) throw new Error('Claims exceed the Auth size limit.');
  return next;
}
