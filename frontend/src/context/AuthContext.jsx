import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('finreview_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    return null;
  });

  const login = async (email, password, rememberMe = false) => {
    const authenticatedUser = {
      name: email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Cognizant Reviewer',
      email: email || 'reviewer@cognizant.com',
      role: 'Lead Financial Reviewer',
      organization: 'Cognizant Audit Practice'
    };

    setUser(authenticatedUser);

    if (rememberMe) {
      localStorage.setItem('finreview_user', JSON.stringify(authenticatedUser));
    } else {
      sessionStorage.setItem('finreview_user', JSON.stringify(authenticatedUser));
    }

    return authenticatedUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('finreview_user');
    sessionStorage.removeItem('finreview_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), login, logout }}>
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
