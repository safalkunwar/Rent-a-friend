import { auth } from '../firebase';
import { firestore } from './firestore';

export type AdminRole =
  | 'super_admin'
  | 'platform_admin'
  | 'safety_admin'
  | 'moderation_admin'
  | 'support_agent'
  | 'booking_admin'
  | 'finance_admin'
  | 'kyc_reviewer'
  | 'content_admin'
  | 'analytics_admin'
  | 'read_only_admin';

export const ADMIN_ROLES: AdminRole[] = [
  'super_admin',
  'platform_admin',
  'safety_admin',
  'moderation_admin',
  'support_agent',
  'booking_admin',
  'finance_admin',
  'kyc_reviewer',
  'content_admin',
  'analytics_admin',
  'read_only_admin',
];

export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
  super_admin: [
    'users.read', 'users.write', 'users.ban',
    'companions.read', 'companions.write', 'companions.verify',
    'bookings.read', 'bookings.write',
    'content.read', 'content.write', 'content.remove',
    'comments.read', 'comments.remove',
    'kyc.read', 'kyc.write',
    'finance.read',
    'sos.read', 'sos.write',
    'audit.read',
    'settings.write',
    'roles.write',
  ],
  platform_admin: [
    'users.read', 'users.write', 'users.ban',
    'companions.read', 'companions.write',
    'bookings.read', 'bookings.write',
    'content.read', 'content.write',
    'kyc.read',
    'finance.read',
    'sos.read',
    'audit.read',
    'settings.write',
  ],
  safety_admin: [
    'users.read',
    'companions.read',
    'bookings.read',
    'sos.read', 'sos.write',
    'audit.read',
  ],
  moderation_admin: [
    'users.read',
    'content.read', 'content.remove',
    'comments.read', 'comments.remove',
    'audit.read',
  ],
  support_agent: [
    'users.read',
    'bookings.read',
    'content.read',
    'comments.read',
    'audit.read',
  ],
  booking_admin: [
    'bookings.read', 'bookings.write',
    'users.read',
    'companions.read',
    'audit.read',
  ],
  finance_admin: [
    'finance.read',
    'bookings.read',
    'users.read',
    'audit.read',
  ],
  kyc_reviewer: [
    'kyc.read', 'kyc.write',
    'users.read',
    'companions.read',
    'audit.read',
  ],
  content_admin: [
    'content.read', 'content.write', 'content.remove',
    'audit.read',
  ],
  analytics_admin: [
    'analytics.read',
    'users.read',
    'bookings.read',
    'content.read',
    'audit.read',
  ],
  read_only_admin: [
    'users.read',
    'companions.read',
    'bookings.read',
    'content.read',
    'comments.read',
    'kyc.read',
    'sos.read',
    'audit.read',
  ],
};

export const hasPermission = (role: AdminRole | undefined | null, permission: string): boolean => {
  if (!role) return false;
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
};

export const adminService = {
  async setUserRole(uid: string, role: AdminRole) {
    const user = auth?.currentUser;
    if (!user) throw new Error('No authenticated admin session');
    await user.getIdToken(true);
    await firestore.setDocument(`admins/${uid}`, {
      uid,
      role,
      updatedAt: new Date().toISOString(),
    }, true);
  },

  async getUserRole(uid: string): Promise<AdminRole | null> {
    const adminDoc = await firestore.getDocument<{ role: AdminRole }>(`admins/${uid}`);
    return adminDoc?.role ?? null;
  },

  async listAdmins() {
    return firestore.getDocuments<{ uid: string; role: AdminRole; updatedAt: string }>('admins', {
      orderByField: 'updatedAt',
      orderDirection: 'desc',
      limitCount: 100,
    });
  },

  async removeAdmin(uid: string) {
    await firestore.deleteDocument(`admins/${uid}`);
  },
};
