import { supabase } from './supabase';

// AI聊天API调用
export const sendChatMessage = async (message: string, sessionId: string, userId?: string) => {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { message, sessionId, userId },
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (error) {
    console.error('AI聊天调用错误:', error);
    throw error;
  }

  return data;
};

// 管理员认证API
export const adminAuth = {
  login: async (username: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'login', username, password }
    });
    if (error) throw error;
    return data;
  },
  
  create: async (username: string, password: string, email: string) => {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'create', username, password, email }
    });
    if (error) throw error;
    return data;
  },
  
  verify: async (token: string) => {
    const { data, error } = await supabase.functions.invoke('admin-auth', {
      body: { action: 'verify' },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (error) throw error;
    return data;
  }
};