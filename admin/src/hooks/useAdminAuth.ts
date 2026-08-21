import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firestore } from '../services/firestore';
import { hasPermission, type AdminRole } from '../services/admin';

type AuthStatus = 'loading' | 'authenticated' | 'unauthorized';

export const useAdminAuth = (requiredPermission = 'users.read') => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setRole(null);
        setStatus('unauthorized');
        return;
      }

      setUser(firebaseUser);

      try {
        const claimRole = (await firebaseUser.getIdTokenResult()).claims.adminRole as AdminRole | undefined;
        if (claimRole && hasPermission(claimRole, requiredPermission)) {
          setRole(claimRole);
          setStatus('authenticated');
          return;
        }

        const adminDoc = await firestore.getDocument<{ role: AdminRole }>(`admins/${firebaseUser.uid}`);
        const docRole = adminDoc?.role ?? null;
        if (docRole && hasPermission(docRole, requiredPermission)) {
          setRole(docRole);
          setStatus('authenticated');
          return;
        }

        setRole(docRole);
        setStatus('unauthorized');
      } catch (error) {
        console.error('[SATHI Admin] Auth check failed:', error);
        setStatus('unauthorized');
      }
    });

    return () => unsubscribe();
  }, [requiredPermission]);

  return { status, user, role };
};
