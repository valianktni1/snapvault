import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('snapvault_token');
    const savedUser = localStorage.getItem('snapvault_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Refresh user from server to get latest role
        api.get('/auth/me').then(res => {
          const updated = res.data;
          localStorage.setItem('snapvault_user', JSON.stringify(updated));
          setUser(updated);
        }).catch(() => {});
      } catch {
        localStorage.removeItem('snapvault_token');
        localStorage.removeItem('snapvault_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('snapvault_token', res.data.token);
    localStorage.setItem('snapvault_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await api.post('/auth/register', { email, password, name });
    localStorage.setItem('snapvault_token', res.data.token);
    localStorage.setItem('snapvault_user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('snapvault_token');
    localStorage.removeItem('snapvault_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
