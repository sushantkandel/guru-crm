import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('crm_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('crm_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((res) => {
        setUser(res.data);
        localStorage.setItem('crm_user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('crm_token');
        localStorage.removeItem('crm_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const setSession = (token, userData) => {
    localStorage.setItem('crm_token', token);
    localStorage.setItem('crm_user', JSON.stringify(userData));
    setUser(userData);
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setSession(res.data.token, res.data.user);
    return res.data.user;
  };

  const registerCompany = async (data) => {
    const res = await api.post('/auth/register-company', data);
    setSession(res.data.token, res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (credential) => {
    const res = await api.post('/auth/google', { credential });
    setSession(res.data.token, res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_user');
    setUser(null);
  };

  const isOwner = user?.role === 'owner';
  const isStaff = user?.role === 'staff';
  const isViewer = user?.role === 'viewer';
  const canEdit = isOwner || isStaff;
  const canDelete = isOwner;
  const canRequestDelete = isStaff;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerCompany,
        loginWithGoogle,
        logout,
        isOwner,
        isStaff,
        isViewer,
        canEdit,
        canDelete,
        canRequestDelete,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
