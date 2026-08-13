import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  hasPermission, getRolePermissions, ADMIN_ROLES, type AdminRole 
} from '../services/admin';
import { auditService } from '../services/audit';
import { adminRateLimiter } from '../services/rateLimiter';

export interface AdminSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: AdminRole | null;
  permissions: string[];
  lastLoginAt: string;
}

type AuthStatus = 'loading' | 'authenticated' | 'unauthorized' | 'access_restricted';

interface AdminAuthContextValue {
  status: AuthStatus;
  session: AdminSession | null;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  isActionAllowed: (action: string) => boolean;
  refreshSession: () => Promise<void>;
  clearError: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined);

const mapFirebaseUserToSession = (firebaseUser: FirebaseUser, role: AdminRole | null): AdminSession => {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    role,
    permissions: role ? getRolePermissions(role) : [],
    lastLoginAt: new Date().toISOString(),
  };
};

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<AdminSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyAdminRole = useCallback(async (firebaseUser: FirebaseUser): Promise<AdminRole | null> => {
    try {
      const idTokenResult = await firebaseUser.getIdTokenResult();
      const claimRole = idTokenResult.claims.adminRole as AdminRole | undefined;
      
      if (claimRole && hasPermission(claimRole, 'users.read')) {
        return claimRole;
      }

      const adminDoc = await getDoc(doc(db!, 'admins', firebaseUser.uid));
      if (adminDoc.exists()) {
        const data = adminDoc.data();
        const role = data.role as AdminRole | undefined;
        if (role && ADMIN_ROLES.includes(role)) {
          return role;
        }
      }

      return null;
    } catch (err) {
      console.error('[AdminAuth] Role verification failed:', err);
      return null;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const currentAuth = auth;
    if (!currentAuth) {
      setStatus('unauthorized');
      setSession(null);
      return;
    }

    const firebaseUser = currentAuth.currentUser;
    if (!firebaseUser) {
      setStatus('unauthorized');
      setSession(null);
      return;
    }

    const role = await verifyAdminRole(firebaseUser);
    if (!role) {
      setStatus('access_restricted');
      setSession(null);
      return;
    }

    setSession(mapFirebaseUserToSession(firebaseUser, role));
    setStatus('authenticated');
    setError(null);
  }, [verifyAdminRole]);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (cancelled) return;

      if (!firebaseUser) {
        setSession(null);
        setStatus('unauthorized');
        setError(null);
        return;
      }

      const role = await verifyAdminRole(firebaseUser);
      if (!role) {
        setSession(null);
        setStatus('access_restricted');
        setError(null);
        return;
      }

      setSession(mapFirebaseUserToSession(firebaseUser, role));
      setStatus('authenticated');
      setError(null);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [verifyAdminRole]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const rateLimitKey = `admin:login:${email}`;
    
    if (!adminRateLimiter.checkAction('login', email, 5)) {
      const errMsg = 'Too many login attempts. Please try again later.';
      setError(errMsg);
      await auditService.log({
        action: 'ADMIN_LOGIN_FAILURE',
        actorId: email,
        actorName: email,
        targetType: 'admin',
        details: { reason: 'rate_limited', email },
      });
      throw new Error(errMsg);
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth!, email, password);
      const role = await verifyAdminRole(userCredential.user);
      
      if (!role) {
        await firebaseSignOut(auth!);
        const errMsg = 'Access restricted. Administrator privileges required.';
        setError(errMsg);
        setStatus('access_restricted');
        await auditService.log({
          action: 'ADMIN_ACCESS_DENIED',
          actorId: userCredential.user.uid,
          actorName: email,
          targetType: 'admin',
          details: { reason: 'no_admin_role', email, uid: userCredential.user.uid },
        });
        throw new Error(errMsg);
      }

      setSession(mapFirebaseUserToSession(userCredential.user, role));
      setStatus('authenticated');
      
      await auditService.log({
        action: 'ADMIN_LOGIN_SUCCESS',
        actorId: userCredential.user.uid,
        actorName: email,
        targetType: 'admin',
        details: { role, email, uid: userCredential.user.uid },
      });
    } catch (err: any) {
      const message = err.message || 'Authentication failed';
      setError(message);
      setStatus('unauthorized');
      
      await auditService.log({
        action: 'ADMIN_LOGIN_FAILURE',
        actorId: email,
        actorName: email,
        targetType: 'admin',
        details: { reason: message, email },
      });
      
      throw err;
    }
  }, [verifyAdminRole]);

  const logout = useCallback(async () => {
    try {
      if (session?.uid) {
        await auditService.log({
          action: 'ADMIN_LOGOUT',
          actorId: session.uid,
          actorName: session.email || 'unknown',
          targetType: 'admin',
          details: { uid: session.uid, role: session.role },
        });
      }
    } catch (err) {
      console.error('[AdminAuth] Audit log error:', err);
    } finally {
      await firebaseSignOut(auth!);
      setSession(null);
      setStatus('unauthorized');
      setError(null);
      adminRateLimiter.clearAll();
    }
  }, [session]);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    try {
      await sendPasswordResetEmail(auth!, email, {
        url: `${window.location.origin}/admin/login`,
        handleCodeInApp: true,
      });
      
      await auditService.log({
        action: 'ADMIN_PASSWORD_RESET_REQUESTED',
        actorId: email,
        actorName: email,
        targetType: 'admin',
        details: { email },
      });
    } catch (err: any) {
      const message = err.message || 'Password reset failed';
      setError(message);
      throw err;
    }
  }, []);

  const hasPerm = useCallback((permission: string): boolean => {
    if (!session) return false;
    return session.permissions.includes(permission);
  }, [session]);

  const checkAction = useCallback((action: string): boolean => {
    if (!session) return false;
    return adminRateLimiter.checkAction(action, session.uid);
  }, [session]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{
      status,
      session,
      error,
      login,
      logout,
      forgotPassword,
      hasPermission: hasPerm,
      isActionAllowed: checkAction,
      refreshSession,
      clearError,
    }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = (): AdminAuthContextValue => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
