const supabaseUrl = 'https://ierqylslaxtnjsymfegm.supabase.co';

// 管理员数据API
export const adminData = {
  getConversations: async (token: string, params?: any) => {
    const url = new URL(`${supabaseUrl}/functions/v1/admin-data/conversations`);
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key]) url.searchParams.append(key, params[key]);
      });
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取对话记录失败');
    }
    
    return await response.json();
  },
  
  getApiConfigs: async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-data/api-configs`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取API配置失败');
    }
    
    return await response.json();
  },
  
  createApiConfig: async (token: string, config: any) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-data/api-configs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('创建API配置失败');
    }
    
    return await response.json();
  },
  
  getBasePrompts: async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-data/base-prompts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('获取基础提示词失败');
    }
    
    return await response.json();
  },
  
  createBasePrompt: async (token: string, prompt: any) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-data/base-prompts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(prompt)
    });
    
    if (!response.ok) {
      throw new Error('创建基础提示词失败');
    }
    
    return await response.json();
  }
};