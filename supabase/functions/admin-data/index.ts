Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const path = url.pathname.split('/').pop();
        const method = req.method;

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase配置缺失');
        }

        // 验证管理员权限 - 使用JWT代替Base64
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('未提供认证token');
        }

        const token = authHeader.replace('Bearer ', '');
        let adminId;
        
        try {
            // JWT验证函数 (复用admin-auth中的相同JWT功能)
            const verifyJWT = async (token: string): Promise<any> => {
                const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production';
                const parts = token.split('.');
                if (parts.length !== 3) {
                    throw new Error('Invalid JWT format');
                }
                
                const [encodedHeader, encodedPayload, encodedSignature] = parts;
                const message = `${encodedHeader}.${encodedPayload}`;
                
                const encoder = new TextEncoder();
                const key = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(JWT_SECRET),
                    { name: 'HMAC', hash: 'SHA-256' },
                    false,
                    ['verify']
                );
                
                const signature = new Uint8Array(atob(encodedSignature + '===').split('').map(c => c.charCodeAt(0)));
                const isValid = await crypto.subtle.verify('HMAC', key, signature, encoder.encode(message));
                
                if (!isValid) {
                    throw new Error('Invalid JWT signature');
                }
                
                const payload = JSON.parse(atob(encodedPayload + '==='));
                
                if (payload.exp && Date.now() / 1000 > payload.exp) {
                    throw new Error('JWT expired');
                }
                
                return payload;
            };

            const payload = await verifyJWT(token);
            const { adminId: decodedAdminId } = payload;
            adminId = decodedAdminId;

            if (!adminId) {
                throw new Error('JWT中缺少adminId');
            }

            // 验证管理员
            const adminResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users?id=eq.${adminId}&is_active=eq.true`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!adminResponse.ok) {
                console.error('管理员验证请求失败:', adminResponse.status, adminResponse.statusText);
                throw new Error('管理员验证失败');
            }

            const admins = await adminResponse.json();
            if (!admins || admins.length === 0) {
                throw new Error('无效的管理员权限');
            }
        } catch (error) {
            console.error('JWT验证错误:', error.message);
            throw new Error('认证失败: ' + error.message);
        }

        if (path === 'conversations' && method === 'GET') {
            // 获取对话记录
            const page = parseInt(url.searchParams.get('page') || '1');
            const limit = parseInt(url.searchParams.get('limit') || '50');
            const sessionId = url.searchParams.get('sessionId');
            const from = url.searchParams.get('from');
            const to = url.searchParams.get('to');

            let query = `${supabaseUrl}/rest/v1/conversations?order=created_at.desc&limit=${limit}&offset=${(page - 1) * limit}`;
            
            if (sessionId) {
                query += `&session_id=eq.${sessionId}`;
            }
            if (from) {
                query += `&created_at=gte.${from}`;
            }
            if (to) {
                query += `&created_at=lte.${to}`;
            }

            const conversationsResponse = await fetch(query, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!conversationsResponse.ok) {
                throw new Error('获取对话记录失败');
            }

            const conversations = await conversationsResponse.json();

            // 获取统计信息
            const statsResponse = await fetch(`${supabaseUrl}/rest/v1/conversations?select=*`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            let stats = { total: 0, today: 0, sessions: 0 };
            if (statsResponse.ok) {
                const allConversations = await statsResponse.json();
                const today = new Date().toISOString().split('T')[0];
                const uniqueSessions = new Set();
                
                allConversations.forEach((conv: any) => {
                    uniqueSessions.add(conv.session_id);
                    if (conv.created_at.startsWith(today)) {
                        stats.today++;
                    }
                });
                
                stats.total = allConversations.length;
                stats.sessions = uniqueSessions.size;
            }

            return new Response(JSON.stringify({
                data: {
                    conversations,
                    stats,
                    pagination: {
                        page,
                        limit,
                        total: stats.total
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (path === 'api-configs' && method === 'GET') {
            // 获取API配置
            const configsResponse = await fetch(`${supabaseUrl}/rest/v1/api_configs?order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!configsResponse.ok) {
                throw new Error('获取API配置失败');
            }

            const configs = await configsResponse.json();
            // 隐藏API密钥
            const safeConfigs = configs.map((config: any) => ({
                ...config,
                api_key: config.api_key ? '***' + config.api_key.slice(-4) : ''
            }));

            return new Response(JSON.stringify({ data: safeConfigs }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (path === 'api-configs' && method === 'POST') {
            // 创建或更新API配置
            const configData = await req.json();
            
            console.log('收到API配置创建请求:', JSON.stringify(configData, null, 2));
            
            // 验证必需字段
            if (!configData.api_provider || !configData.api_key) {
                throw new Error('API提供商和API密钥为必填项');
            }
            
            // 确保 parameters是有效的JSON对象
            let parameters = {};
            if (configData.parameters) {
                if (typeof configData.parameters === 'string') {
                    try {
                        parameters = JSON.parse(configData.parameters);
                    } catch (e) {
                        parameters = {};
                    }
                } else if (typeof configData.parameters === 'object') {
                    parameters = configData.parameters;
                }
            }
            
            const insertData = {
                api_provider: configData.api_provider,
                api_key: configData.api_key,
                api_host: configData.api_host || null,
                api_endpoint: configData.api_endpoint || null,
                model_name: configData.model_name || null,
                parameters: parameters,
                is_active: configData.is_active !== undefined ? configData.is_active : true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            console.log('准备插入数据:', JSON.stringify(insertData, null, 2));
            
            const response = await fetch(`${supabaseUrl}/rest/v1/api_configs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(insertData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Supabase插入失败:', response.status, errorText);
                throw new Error(`创建API配置失败: ${errorText}`);
            }

            const result = await response.json();
            console.log('API配置创建成功:', result);
            
            return new Response(JSON.stringify({ data: result[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (path === 'base-prompts' && method === 'GET') {
            // 获取基础提示词
            const promptsResponse = await fetch(`${supabaseUrl}/rest/v1/base_prompts?order=created_at.desc`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            if (!promptsResponse.ok) {
                throw new Error('获取基础提示词失败');
            }

            const prompts = await promptsResponse.json();
            return new Response(JSON.stringify({ data: prompts }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (path === 'base-prompts' && method === 'POST') {
            // 创建或更新基础提示词
            const promptData = await req.json();
            
            const response = await fetch(`${supabaseUrl}/rest/v1/base_prompts`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    ...promptData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`创建基础提示词失败: ${errorText}`);
            }

            const result = await response.json();
            return new Response(JSON.stringify({ data: result[0] }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else {
            throw new Error('不支持的API路径或方法');
        }

    } catch (error) {
        console.error('管理员数据API错误:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_DATA_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});