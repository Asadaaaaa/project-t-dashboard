import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identity: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('projectt_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('projectt_token');
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('projectt_token');
      if (storedToken) {
        try {
          const resp = await api.get('/auth/me');
          if (resp.data && resp.data.data) {
            setUser(resp.data.data);
            localStorage.setItem('projectt_user', JSON.stringify(resp.data.data));
          }
        } catch (err) {
          console.error('Session validation failed:', err);
          logout();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (identity: string, password: string) => {
    const resp = await api.post('/auth/login', { identity, password });
    const { token: authToken, user: userData } = resp.data.data;

    setToken(authToken);
    setUser(userData);
    localStorage.setItem('projectt_token', authToken);
    localStorage.setItem('projectt_user', JSON.stringify(userData));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('projectt_token');
    localStorage.removeItem('projectt_user');
    try {
      api.post('/auth/logout');
    } catch {}
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    // Admin has full permissions
    if (hasRole('admin')) return true;
    if (!user.permissions) return false;
    return user.permissions.includes(permission);
  };

  const hasRole = (roleName: string): boolean => {
    if (!user || !user.roles) return false;
    if (Array.isArray(user.roles)) {
      return user.roles.some((r) => (typeof r === 'string' ? r === roleName : r.name === roleName));
    }
    return false;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        logout,
        hasPermission,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
