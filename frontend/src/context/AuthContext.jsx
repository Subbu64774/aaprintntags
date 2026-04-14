import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../api';

const AuthCtx = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // On mount, validate existing token
  useEffect(() => {
    if (token) {
      api.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => setUser(res.data))
        .catch(() => { setToken(null); localStorage.removeItem('token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    const data = res.data;
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser({
      username: data.username,
      fullName: data.fullName,
      role: data.role,
      tenantId: data.tenantId,
      tenantName: data.tenantName,
      tenantLogoUrl: data.tenantLogoUrl,
      permissions: data.permissions || [],
    });
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isAdminOrManager = isAdmin || isManager;
  const isViewer = user?.role === 'VIEWER';

  // Permission check helper: hasPerm('customers:edit')
  const hasPerm = useCallback((perm) => {
    if (!user) return false;
    if (isAdmin || isManager) return true; // full access
    return (user.permissions || []).includes(perm);
  }, [user, isAdmin, isManager]);

  // Can user manage users? (ADMIN or MANAGER)
  const canManageUsers = isAdminOrManager;

  const value = useMemo(() => ({
    user, token, login, logout,
    isAuthenticated, isAdmin, isManager, isAdminOrManager, isViewer,
    hasPerm, canManageUsers, loading,
  }), [user, token, isAuthenticated, isAdmin, isManager, isAdminOrManager, isViewer, hasPerm, canManageUsers, loading]);

  return (
    <AuthCtx.Provider value={value}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
