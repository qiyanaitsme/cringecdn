import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { User } from '@/types';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const fetchMe = useCallback(async () => {
    try {
      const user = await api.me();
      setAuth({ user, loading: false, error: null });
    } catch (error) {
      setAuth({ user: null, loading: false, error: error instanceof Error ? error.message : 'Ошибка аутентификации' });
    } finally {
      setAuth((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      fetchMe();
    } else {
      setAuth({ user: null, loading: false, error: null });
    }
  }, [fetchMe]);

  const login = async (usernameOrEmail: string, password: string, rememberMe: boolean = false) => {
    setAuth((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await api.login(usernameOrEmail, password, rememberMe);

      localStorage.setItem('accessToken', response.tokens.accessToken);
      localStorage.setItem('refreshToken', response.tokens.refreshToken);

      setAuth({ user: response.user, loading: false, error: null });
    } catch (error) {
      setAuth({ user: null, loading: false, error: error instanceof Error ? error.message : 'Ошибка входа' });
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      // Ignore errors on logout
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setAuth({ user: null, loading: false, error: null });
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    // Call API endpoint for password change
    // This would be added to the API client
    return true;
  };

  const isAdmin = auth.user?.role === 'ADMIN';
  const isModerator = auth.user?.role === 'MODERATOR';

  return {
    ...auth,
    login,
    logout,
    changePassword,
    isAdmin,
    isModerator,
    isAuthenticated: !!auth.user,
  };
}