import { adminService, hasPermission, type AdminRole } from '../services/admin';

export type Permission = string;

export const requirePermission = (permission: Permission): boolean => {
  const role = adminService.getUserRoleSync?.() ?? null;
  return hasPermission(role, permission);
};

export const can = (permission: Permission): boolean => requirePermission(permission);

export const canAny = (permissions: Permission[]): boolean =>
  permissions.some(requirePermission);

export const canAll = (permissions: Permission[]): boolean =>
  permissions.every(requirePermission);

export const getRoleBadgeColor = (role: AdminRole): string => {
  switch (role) {
    case 'super_admin':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'platform_admin':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    case 'safety_admin':
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    case 'moderation_admin':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'support_agent':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'booking_admin':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'finance_admin':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'kyc_reviewer':
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    case 'content_admin':
      return 'bg-pink-500/20 text-pink-400 border-pink-500/30';
    case 'analytics_admin':
      return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
    case 'read_only_admin':
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
};

export const getRoleLabel = (role: AdminRole): string => {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'platform_admin':
      return 'Platform Admin';
    case 'safety_admin':
      return 'Safety Admin';
    case 'moderation_admin':
      return 'Moderation Admin';
    case 'support_agent':
      return 'Support Agent';
    case 'booking_admin':
      return 'Booking Admin';
    case 'finance_admin':
      return 'Finance Admin';
    case 'kyc_reviewer':
      return 'KYC Reviewer';
    case 'content_admin':
      return 'Content Admin';
    case 'analytics_admin':
      return 'Analytics Admin';
    case 'read_only_admin':
      return 'Read Only';
    default:
      return 'Unknown';
  }
};
