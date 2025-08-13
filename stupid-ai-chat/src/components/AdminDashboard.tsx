import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  LogOut, 
  MessageSquare, 
  Settings, 
  FileText, 
  BarChart3,
  Plus,
  Trash2,
  Edit,
  Save,
  X
} from 'lucide-react';
import { useAdmin } from '../contexts/AdminContext';
import { adminData } from '../lib/adminApi';
import toast from 'react-hot-toast';

interface Conversation {
  id: number;
  session_id: string;
  message_type: string;
  message_content: string;
  api_provider_used?: string;
  model_used?: string;
  tokens_used?: number;
  response_time?: number;
  created_at: string;
}

interface ApiConfig {
  id: number;
  api_provider: string;
  api_key: string;
  api_host?: string;
  api_endpoint?: string;
  model_name?: string;
  parameters?: any;
  is_active: boolean;
  created_at: string;
}

interface BasePrompt {
  id: number;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { admin, logout, token } = useAdmin();
  const [activeTab, setActiveTab] = useState('overview');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [apiConfigs, setApiConfigs] = useState<ApiConfig[]>([]);
  const [basePrompts, setBasePrompts] = useState<BasePrompt[]>([]);
  const [stats, setStats] = useState({ total: 0, today: 0, sessions: 0 });
  const [loading, setLoading] = useState(false);
  
  // 新增API配置状态
  const [showAddConfig, setShowAddConfig] = useState(false);
  const [newConfig, setNewConfig] = useState({
    api_provider: 'OpenAI',
    api_key: '',
    api_host: '',
    api_endpoint: '',
    model_name: 'gpt-3.5-turbo',
    parameters: '{}',
    is_active: true
  });
  
  // 新增提示词状态
  const [showAddPrompt, setShowAddPrompt] = useState(false);
  const [newPrompt, setNewPrompt] = useState({
    title: '',
    content: '',
    is_active: true
  });

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, activeTab]);

  const loadData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'conversations') {
        const convData = await adminData.getConversations(token, { limit: 50 });
        setConversations(convData.data.conversations);
        setStats(convData.data.stats);
      }
      
      if (activeTab === 'api-config') {
        const configData = await adminData.getApiConfigs(token);
        setApiConfigs(configData.data);
      }
      
      if (activeTab === 'prompts') {
        const promptData = await adminData.getBasePrompts(token);
        setBasePrompts(promptData.data);
      }
    } catch (error: any) {
      console.error('加载数据失败:', error);
      toast.error(error.message || '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAddConfig = async () => {
    if (!token) return;
    
    try {
      // 数据验证
      if (!newConfig.api_provider.trim()) {
        toast.error('API提供商不能为空');
        return;
      }
      
      if (!newConfig.api_key.trim()) {
        toast.error('API密钥不能为空');
        return;
      }
      
      // 验证API Host格式
      if (newConfig.api_host && newConfig.api_host.trim()) {
        try {
          new URL(newConfig.api_host);
        } catch (urlError) {
          toast.error('API Host格式不正确，请输入有效的URL');
          return;
        }
      }
      
      // 验证JSON格式参数
      let parameters = {};
      if (newConfig.parameters.trim()) {
        try {
          parameters = JSON.parse(newConfig.parameters);
          if (typeof parameters !== 'object' || parameters === null || Array.isArray(parameters)) {
            throw new Error('参数必须是一个有效的JSON对象');
          }
        } catch (jsonError) {
          toast.error(`参数格式错误: ${jsonError.message}`);
          return;
        }
      }
      
      await adminData.createApiConfig(token, {
        ...newConfig,
        parameters
      });
      
      toast.success('API配置创建成功');
      setShowAddConfig(false);
      setNewConfig({
        api_provider: 'OpenAI',
        api_key: '',
        api_host: '',
        api_endpoint: '',
        model_name: 'gpt-3.5-turbo',
        parameters: '{}',
        is_active: true
      });
      loadData();
    } catch (error: any) {
      console.error('创建API配置失败:', error);
      toast.error(error.message || '创建API配置失败');
    }
  };

  const handleAddPrompt = async () => {
    if (!token) return;
    
    try {
      await adminData.createBasePrompt(token, newPrompt);
      
      toast.success('基础提示词创建成功');
      setShowAddPrompt(false);
      setNewPrompt({
        title: '',
        content: '',
        is_active: true
      });
      loadData();
    } catch (error: any) {
      console.error('创建基础提示词失败:', error);
      toast.error(error.message || '创建基础提示词失败');
    }
  };

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">总对话数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">今日对话</p>
              <p className="text-2xl font-bold text-gray-900">{stats.today}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">会话数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sessions}</p>
            </div>
            <Settings className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">最近对话</h3>
        <div className="space-y-3">
          {conversations.slice(0, 5).map((conv) => (
            <div key={conv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <p className="text-sm text-gray-900 truncate">{conv.message_content}</p>
                <p className="text-xs text-gray-500">
                  {conv.session_id} · {new Date(conv.created_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${
                conv.message_type === 'user' 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {conv.message_type === 'user' ? '用户' : 'AI'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderConversations = () => (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold text-gray-900">对话记录</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">会话ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">内容</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">模型</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {conversations.map((conv) => (
              <tr key={conv.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">{conv.session_id.slice(-8)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    conv.message_type === 'user' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {conv.message_type === 'user' ? '用户' : 'AI'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                  {conv.message_content}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(conv.created_at).toLocaleString('zh-CN')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {conv.model_used || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderApiConfig = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">API配置管理</h3>
        <button
          onClick={() => setShowAddConfig(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新增API配置</span>
        </button>
      </div>
      
      <div className="grid gap-6">
        {apiConfigs.map((config) => (
          <div key={config.id} className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-lg font-medium text-gray-900">{config.api_provider}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  config.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {config.is_active ? '激活' : '禁用'}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="block text-gray-600">模型名称</label>
                <p className="text-gray-900">{config.model_name || '-'}</p>
              </div>
              <div>
                <label className="block text-gray-600">API密钥</label>
                <p className="text-gray-900">{config.api_key}</p>
              </div>
              <div>
                <label className="block text-gray-600">API Host (基础URL)</label>
                <p className="text-gray-900">{config.api_host || '默认'}</p>
              </div>
              <div>
                <label className="block text-gray-600">API端点</label>
                <p className="text-gray-900">{config.api_endpoint || '默认'}</p>
              </div>
              <div>
                <label className="block text-gray-600">创建时间</label>
                <p className="text-gray-900">{new Date(config.created_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 新增API配置弹窗 */}
      {showAddConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">新增API配置</h4>
              <button onClick={() => setShowAddConfig(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API提供商</label>
                <select
                  value={newConfig.api_provider}
                  onChange={(e) => {
                    const provider = e.target.value;
                    let defaultHost = '';
                    let defaultModel = '';
                    
                    if (provider === 'OpenAI') {
                      defaultHost = 'https://api.openai.com';
                      defaultModel = 'gpt-3.5-turbo';
                    } else if (provider === 'Claude') {
                      defaultHost = 'https://api.anthropic.com';
                      defaultModel = 'claude-3-sonnet-20240229';
                    }
                    
                    setNewConfig({ 
                      ...newConfig, 
                      api_provider: provider,
                      api_host: defaultHost,
                      model_name: defaultModel
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Claude">Claude</option>
                  <option value="Custom">自定义</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Host (基础URL)</label>
                <input
                  type="url"
                  value={newConfig.api_host}
                  onChange={(e) => setNewConfig({ ...newConfig, api_host: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="例如: https://api.openai.com"
                />
                <p className="text-xs text-gray-500 mt-1">API服务的基础URL地址，选择提供商时会自动填充</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API密钥</label>
                <input
                  type="text"
                  value={newConfig.api_key}
                  onChange={(e) => setNewConfig({ ...newConfig, api_key: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="输入API密钥"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={newConfig.model_name}
                  onChange={(e) => setNewConfig({ ...newConfig, model_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="输入模型名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">模型参数 (JSON格式)</label>
                <textarea
                  value={newConfig.parameters}
                  onChange={(e) => {
                    setNewConfig({ ...newConfig, parameters: e.target.value });
                    // 实时验证JSON格式
                    if (e.target.value.trim()) {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
                          e.target.setCustomValidity('参数必须是一个有效的JSON对象');
                        } else {
                          e.target.setCustomValidity('');
                        }
                      } catch (jsonError) {
                        e.target.setCustomValidity('JSON格式错误');
                      }
                    } else {
                      e.target.setCustomValidity('');
                    }
                  }}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg font-mono text-sm"
                  placeholder='{
  "max_tokens": 1000,
  "temperature": 0.7
}'
                />
                <p className="text-xs text-gray-500 mt-1">请输入有效的JSON格式参数，例如: {'{"max_tokens": 1000, "temperature": 0.7}'}</p>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddConfig(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddConfig}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderPrompts = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">基础提示词管理</h3>
        <button
          onClick={() => setShowAddPrompt(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>新增提示词</span>
        </button>
      </div>
      
      <div className="grid gap-6">
        {basePrompts.map((prompt) => (
          <div key={prompt.id} className="bg-white rounded-lg p-6 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <h4 className="text-lg font-medium text-gray-900">{prompt.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  prompt.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {prompt.is_active ? '激活' : '禁用'}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">提示词内容</label>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap">{prompt.content}</p>
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                创建时间：{new Date(prompt.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* 新增提示词弹窗 */}
      {showAddPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold">新增基础提示词</h4>
              <button onClick={() => setShowAddPrompt(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={newPrompt.title}
                  onChange={(e) => setNewPrompt({ ...newPrompt, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="输入提示词标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">提示词内容</label>
                <textarea
                  value={newPrompt.content}
                  onChange={(e) => setNewPrompt({ ...newPrompt, content: e.target.value })}
                  rows={10}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  placeholder="输入详细的提示词内容..."
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowAddPrompt(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleAddPrompt}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">世界上最聪明的人工智能陈狗 管理后台</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">欢迎，{admin?.username}</span>
              <button
                onClick={logout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>退出</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex">
          {/* Sidebar */}
          <div className="w-64 mr-8">
            <nav className="space-y-2">
              {[
                { id: 'overview', label: '概览', icon: BarChart3 },
                { id: 'conversations', label: '对话记录', icon: MessageSquare },
                { id: 'api-config', label: 'API配置', icon: Settings },
                { id: 'prompts', label: '基础提示词', icon: FileText }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">加载中...</div>
              </div>
            ) : (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'conversations' && renderConversations()}
                {activeTab === 'api-config' && renderApiConfig()}
                {activeTab === 'prompts' && renderPrompts()}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;