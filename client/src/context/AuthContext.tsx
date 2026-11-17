import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  role: 'admin' | 'user' | null;
  name: string | null;
  login: (token: string, role: 'admin' | 'user', name: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  role: null,
  name: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [role, setRole] = useState<'admin' | 'user' | null>(localStorage.getItem('role') as any);
  const [name, setName] = useState<string | null>(localStorage.getItem('name'));

  const login = (newToken: string, newRole: 'admin' | 'user', newName: string) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('role', newRole);
    localStorage.setItem('name', newName);
    setToken(newToken);
    setRole(newRole);
    setName(newName);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('name');
    setToken(null);
    setRole(null);
    setName(null);
  };

  return (
    <AuthContext.Provider value={{ token, role, name, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
