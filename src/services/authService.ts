import { User, RoleName, UserPermissions } from '../domain/types';
import { userRepo } from '../repositories';

export const ROLE_PERMISSIONS: Record<RoleName, UserPermissions> = {
  Administrator: {
    canManageUsers: true,
    canManageMaster: true,
    canPurchase: true,
    canSell: true,
    canManageCash: true,
    canViewReports: true,
    canManageSettings: true,
    canBackupRestore: true,
    canAdjustStock: true,
    canVoid: true,
  },
  Ketua: {
    canManageUsers: false,
    canManageMaster: false,
    canPurchase: true,
    canSell: true,
    canManageCash: true,
    canViewReports: true,
    canManageSettings: false,
    canBackupRestore: false,
    canAdjustStock: true,
    canVoid: true,
  },
  Bendahara: {
    canManageUsers: false,
    canManageMaster: false,
    canPurchase: true,
    canSell: true,
    canManageCash: true,
    canViewReports: true,
    canManageSettings: false,
    canBackupRestore: true,
    canAdjustStock: false,
    canVoid: true,
  },
  Pengurus: {
    canManageUsers: false,
    canManageMaster: true,
    canPurchase: true,
    canSell: true,
    canManageCash: false,
    canViewReports: true,
    canManageSettings: false,
    canBackupRestore: false,
    canAdjustStock: true,
    canVoid: false,
  },
  Kasir: {
    canManageUsers: false,
    canManageMaster: false,
    canPurchase: false,
    canSell: true,
    canManageCash: true,
    canViewReports: false,
    canManageSettings: false,
    canBackupRestore: false,
    canAdjustStock: false,
    canVoid: false,
  },
  Viewer: {
    canManageUsers: false,
    canManageMaster: false,
    canPurchase: false,
    canSell: false,
    canManageCash: false,
    canViewReports: true,
    canManageSettings: false,
    canBackupRestore: false,
    canAdjustStock: false,
    canVoid: false,
  },
};

export function getPermissionsForRole(roleName: RoleName): UserPermissions {
  return ROLE_PERMISSIONS[roleName] || ROLE_PERMISSIONS.Viewer;
}

const CURRENT_USER_KEY = 'kopsek_active_user_id';

export async function getCurrentUser(schoolId: string): Promise<User> {
  const users = await userRepo.getAll(schoolId);
  if (users.length === 0) {
    throw new Error('No users found. Please initialize seed data.');
  }

  const savedUserId = localStorage.getItem(CURRENT_USER_KEY);
  if (savedUserId) {
    const found = users.find((u) => u.id === savedUserId);
    if (found && found.status === 'Active') {
      return found;
    }
  }

  // Default to Admin or Kasir
  const defaultUser = users.find((u) => u.username === 'kasir') || users[0];
  localStorage.setItem(CURRENT_USER_KEY, defaultUser.id);
  return defaultUser;
}

export function setActiveUser(userId: string): void {
  localStorage.setItem(CURRENT_USER_KEY, userId);
}
