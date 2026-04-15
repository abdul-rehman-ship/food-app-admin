'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAdminAuth, removeAdminAuth, setAdminAuth } from '../lib/cookies';
import { checkAdminKey } from '../lib/firebase';
import toast from 'react-hot-toast';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (key: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const auth = getAdminAuth();
      const authenticated = auth === 'true';
      setIsAuthenticated(authenticated);
      setLoading(false);
      
      // Redirect if not authenticated and not on login page
      if (!authenticated && pathname !== '/login') {
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [pathname, router]);

  const login = async (key: string): Promise<boolean> => {
    const isValid = await checkAdminKey(key);
    if (isValid) {
      setAdminAuth('true');
      setIsAuthenticated(true);
      toast.success('Login successful!');
      router.push('/');
      return true;
    } else {
      toast.error('Invalid admin key');
      return false;
    }
  };

  const logout = () => {
    removeAdminAuth();
    setIsAuthenticated(false);
    toast.success('Logged out successfully');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};