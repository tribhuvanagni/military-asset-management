import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('kb_token');
    const storedUser = localStorage.getItem('kb_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setCurrentUser(JSON.parse(storedUser));
    }
    setAuthLoading(false);
  }, []);

  const signIn = useCallback(async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, user } = response.data;

    localStorage.setItem('kb_token', newToken);
    localStorage.setItem('kb_user', JSON.stringify(user));
    setToken(newToken);
    setCurrentUser(user);

    return user;
  }, []);

  const signOut = useCallback(() => {
    localStorage.removeItem('kb_token');
    localStorage.removeItem('kb_user');
    setToken(null);
    setCurrentUser(null);
  }, []);

  const isAuthenticated = !!token;

  const hasRole = useCallback((...roles) => {
    return currentUser && roles.includes(currentUser.role);
  }, [currentUser]);

  const value = {
    currentUser,
    token,
    authLoading,
    isAuthenticated,
    signIn,
    signOut,
    hasRole
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
