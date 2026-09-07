import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { School, Cooperative, User, UserPermissions, CashSession, AppSettings } from '../domain/types';
import { initializeSeedData, DEFAULT_SCHOOL_ID } from '../services/seedData';
import { getCurrentUser, setActiveUser, getPermissionsForRole } from '../services/authService';
import { userRepo, settingsRepo, cashRepo } from '../repositories';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextType {
  school: School | null;
  cooperative: Cooperative | null;
  settings: AppSettings | null;
  currentUser: User | null;
  permissions: UserPermissions;
  allUsers: User[];
  activeSession: CashSession | null;
  isLoading: boolean;
  toasts: Toast[];
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
  switchUser: (userId: string) => Promise<void>;
  refreshContext: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [school, setSchool] = useState<School | null>(null);
  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshContext = useCallback(async () => {
    try {
      await initializeSeedData();

      const schoolData = await settingsRepo.getSchool(DEFAULT_SCHOOL_ID);
      if (schoolData) setSchool(schoolData);

      const coopData = await settingsRepo.getCooperative(DEFAULT_SCHOOL_ID);
      if (coopData) setCooperative(coopData);

      const settingsData = await settingsRepo.getSettings(DEFAULT_SCHOOL_ID);
      if (settingsData) setSettings(settingsData);

      const usersList = await userRepo.getAll(DEFAULT_SCHOOL_ID);
      setAllUsers(usersList);

      const user = await getCurrentUser(DEFAULT_SCHOOL_ID);
      setCurrentUserState(user);

      const session = await cashRepo.getActiveSession(DEFAULT_SCHOOL_ID);
      setActiveSession(session || null);
    } catch (err) {
      console.error('Failed to initialize app data:', err);
      notify('Gagal memuat basis data lokal IndexedDB', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    refreshContext();
  }, [refreshContext]);

  const switchUser = async (userId: string) => {
    setActiveUser(userId);
    const target = allUsers.find((u) => u.id === userId);
    if (target) {
      setCurrentUserState(target);
      notify(`Beralih akun ke: ${target.full_name} (${target.role_name})`, 'info');
    }
  };

  const permissions = currentUser
    ? getPermissionsForRole(currentUser.role_name)
    : getPermissionsForRole('Viewer');

  return (
    <AppContext.Provider
      value={{
        school,
        cooperative,
        settings,
        currentUser,
        permissions,
        allUsers,
        activeSession,
        isLoading,
        toasts,
        notify,
        dismissToast,
        switchUser,
        refreshContext,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
