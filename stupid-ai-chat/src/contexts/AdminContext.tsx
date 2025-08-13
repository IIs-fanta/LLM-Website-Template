import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminAuth } from '../lib/api';
import toast from 'react-hot-toast';

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

interface AdminContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  token: string | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin必须在AdminProvider内使用');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // 检查本地存储中的token
    const savedToken = localStorage.getItem('adminToken');
    if (savedToken) {
      verifyToken(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const result = await adminAuth.verify(tokenToVerify);
      if (result.data.valid) {
        setAdmin(result.data.admin);
        setToken(tokenToVerify);
      } else {
        localStorage.removeItem('adminToken');
      }
    } catch (error) {
      console.error('Token验证失败:', error);
      localStorage.removeItem('adminToken');
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const result = await adminAuth.login(username, password);
      
      if (result.data.success) {
        const newToken = result.data.sessionToken;
        setAdmin(result.data.admin);
        setToken(newToken);
        localStorage.setItem('adminToken', newToken);
        toast.success('登录成功');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('登录失败:', error);
      toast.error(error.message || '登录失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setAdmin(null);
    setToken(null);
    localStorage.removeItem('adminToken');
    toast.success('已退出登录');
  };

  return (
    <AdminContext.Provider value={{ admin, loading, login, logout, token }}>
      {children}
    </AdminContext.Provider>
  );
};