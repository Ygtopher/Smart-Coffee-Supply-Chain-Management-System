import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import apiService from '../services/api';
import { toast } from 'sonner';

export type UserRole = 'farmer' | 'aggregator' | 'processor' | 'quality' | 'logistics' | 'exporter' | 'admin';

const ROLE_MAP: Record<string, UserRole> = {
  'FARMER': 'farmer',
  'AGGREGATOR': 'aggregator',
  'PROCESSOR': 'processor',
  'QUALITY_CONTROLLER': 'quality',
  'LOGISTICS': 'logistics',
  'EXPORTER': 'exporter',
  'ADMIN': 'admin',
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
  location: string;
  phone?: string;
  permissions?: { modules?: string[] } | Record<string, any>;
  mfaEnabled?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}

type LoginResult =
  | { success: true; mfaRequired: true; tempUser: any }
  | { success: true; mfaRequired: false }
  | { success: false; mfaRequired: false };

interface AuthContextType {
  user: User | null;
  loginWithCredentials: (email: string, password: string) => Promise<LoginResult>;
  verifyMfaAndCompleteLogin: (tempUser: any, otp: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  setPendingFarmer: () => void;
  updateAuthenticatedUser: (updates: Partial<User>) => void;
  refreshAuthenticatedUser: () => Promise<User | null>;
  hasPermission: (moduleName: string) => boolean;
  isPending: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 3);
}

function mapBackendUser(backendUser: any): User {
  const displayName = backendUser.fullName || backendUser.email;
  return {
    id: backendUser.userId,
    name: displayName,
    email: backendUser.email,
    role: ROLE_MAP[backendUser.role] || 'farmer',
    initials: getInitials(displayName),
    location: 'Rwanda',
    phone: backendUser.phone || undefined,
    permissions: backendUser.permissions || undefined,
    mfaEnabled: Boolean(backendUser.mfaEnabled),
    status: backendUser.status === 'pending' || backendUser.status === 'rejected' ? backendUser.status : 'approved',
  };
}

function permissionModules(permissions: User['permissions']): string[] {
  if (!permissions) return [];
  if (Array.isArray(permissions)) return permissions;
  if (Array.isArray((permissions as any).modules)) return (permissions as any).modules;
  return Object.entries(permissions).filter(([, value]) => Boolean(value)).map(([key]) => key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAuthenticatedUser = useCallback(async (): Promise<User | null> => {
    const token = apiService.getToken();
    if (!token) return null;
    const response = await apiService.getCurrentUser();
    const refreshed = mapBackendUser(response.data);
    setUser(refreshed);
    localStorage.setItem('auth_user', JSON.stringify(refreshed));
    return refreshed;
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('auth_user');
    const savedToken = localStorage.getItem('auth_token');
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        apiService.setToken(savedToken);
        refreshAuthenticatedUser().catch(() => undefined).finally(() => setIsLoading(false));
        return;
      } catch {
        // Corrupted storage — clear it
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    setIsLoading(false);
  }, [refreshAuthenticatedUser]);

  useEffect(() => {
    if (!user) return;
    const refresh = () => { refreshAuthenticatedUser().catch(() => undefined); };
    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    const interval = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('role-permissions-updated', refresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('role-permissions-updated', refresh);
    };
  }, [refreshAuthenticatedUser, user?.id]);

  const loginWithCredentials = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    try {
      const response = await apiService.login(email, password);
      const backendUser = response.user;

      // If backend says MFA is enabled, we stop here and tell the UI to route to MFA
      if (backendUser.mfaEnabled) {
        return { success: true, mfaRequired: true, tempUser: backendUser };
      }

      // No MFA needed, complete login
      const mappedUser = mapBackendUser(backendUser);

      apiService.setToken(response.token);
      setUser(mappedUser);
      setIsPending(false);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      return { success: true, mfaRequired: false };
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials');
      return { success: false, mfaRequired: false };
    }
  }, []);

  const verifyMfaAndCompleteLogin = useCallback(async (tempUser: any, otp: string): Promise<boolean> => {
    try {
      // Send OTP to backend to verify
      const response = await apiService.verifyMfa(tempUser.email, otp);

      const mappedUser = mapBackendUser(response.user);

      apiService.setToken(response.token);
      setUser(mappedUser);
      setIsPending(false);
      localStorage.setItem('auth_user', JSON.stringify(mappedUser));
      return true;
    } catch (err: any) {
      toast.error(err.message || 'Invalid MFA code');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setIsPending(false);
    apiService.setToken(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  }, []);

  const setPendingFarmer = useCallback(() => {
    setIsPending(true);
    setUser(null);
  }, []);

  const updateAuthenticatedUser = useCallback((updates: Partial<User>) => {
    setUser(current => {
      if (!current) return current;
      const nextName = updates.name || current.name;
      const next = {
        ...current,
        ...updates,
        initials: updates.initials || getInitials(nextName),
      };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
  }, []);

  const hasPermission = useCallback((moduleName: string) => {
    if (!user) return false;
    const modules = permissionModules(user.permissions);
    return modules.includes('*') || modules.includes(moduleName);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{ user, loginWithCredentials, verifyMfaAndCompleteLogin, logout, isAuthenticated: !!user, setPendingFarmer, updateAuthenticatedUser, refreshAuthenticatedUser, hasPermission, isPending, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
