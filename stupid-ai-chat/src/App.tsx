import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AdminProvider, useAdmin } from './contexts/AdminContext';
import ChatInterface from './components/ChatInterface';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

// 管理员路由保护组件
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, loading } = useAdmin();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  
  return admin ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

// 已登录管理员访问登录页时重定向
const AdminLoginRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { admin, loading } = useAdmin();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }
  
  return admin ? <Navigate to="/admin" replace /> : <>{children}</>;
};

function App() {
  return (
    <AdminProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 用户聊天界面 */}
            <Route path="/" element={<ChatInterface />} />
            
            {/* 管理员登录 */}
            <Route 
              path="/admin/login" 
              element={
                <AdminLoginRoute>
                  <AdminLogin />
                </AdminLoginRoute>
              } 
            />
            
            {/* 管理员后台 */}
            <Route 
              path="/admin" 
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              } 
            />
            
            {/* 默认重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          
          {/* Toast 通知 */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AdminProvider>
  );
}

export default App;