import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';


const AuthContext = createContext({
  user: null,
  setUser: () => {},
  loading: false,
  token: null,
});

export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(() => {

    const savedUser = localStorage.getItem('user');

    return savedUser ? JSON.parse(savedUser) : null;

  });

  const [loading, setLoading] = useState(false);

  const [token, setToken] = useState(
    localStorage.getItem('token')
  );

  return (
    <AuthContext.Provider value={{ user, setUser, loading, token }}>
      {children}
    </AuthContext.Provider>
  );

};

const login = async (username, password) => {

  // LOGIN SEMENTARA UNTUK VERCEL
  if (username === 'admin' && password === 'admin123') {

    const userData = {
      username: 'admin',
      role: 'admin'
    };

    const newToken = 'dummy-token';

    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));

    setToken(newToken);
    setUser(userData);

    return { success: true };
  }

  return {
    success: false,
    message: 'Login failed'
  };
};

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
