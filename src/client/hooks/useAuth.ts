/**
 * LAKNES Auth State Hook
 * Manages user session, sign-in, and identity.
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from '../../types/contracts.ts';
import { laknesClient } from '../api-client.ts';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('laknes_auth_token') : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    laknesClient.setToken(token);
    if (token && typeof localStorage !== 'undefined') {
      localStorage.setItem('laknes_auth_token', token);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('laknes_auth_token');
    }
  }, [token]);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const currentUser = await laknesClient.getCurrentUser();
      setUser(currentUser);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await laknesClient.login({ email, password });
      setToken(result.token);
      setUser(result.user);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (username: string, email: string, password?: string, bio?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await laknesClient.register({ username, email, password, bio });
      setToken(result.token);
      setUser(result.user);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await laknesClient.logout();
    } finally {
      setToken(null);
      setUser(null);
    }
  };

  const loginWithGoogle = async (payload: { credential?: string; email?: string; name?: string; picture?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await laknesClient.authenticateWithGoogle(payload);
      setToken(result.token);
      setUser(result.user);
      return result;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setError(e);
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    return await laknesClient.changePassword(currentPassword, newPassword);
  };

  const requestPasswordReset = async (email: string) => {
    return await laknesClient.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (resetToken: string, newPassword: string) => {
    return await laknesClient.confirmPasswordReset(resetToken, newPassword);
  };

  return {
    user,
    token,
    isAuthenticated: Boolean(user),
    isLoading,
    error,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshUser,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
  };
}
