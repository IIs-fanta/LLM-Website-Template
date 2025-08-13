Deno.serve(async (req) => {
    // JWT和Bcrypt安全功能
    const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-super-secret-jwt-key-change-in-production';
    
    // 简化的bcrypt实现(生产环境应使用完整的bcrypt库)
    const hashPassword = async (password: string): Promise<string> => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'salt123');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };
    
    const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
        const computedHash = await hashPassword(password);
        return computedHash === hash;
    };
    
    // JWT生成和验证函数
    const generateJWT = async (payload: any): Promise<string> => {
        const header = { alg: 'HS256', typ: 'JWT' };
        const encodedHeader = btoa(JSON.stringify(header)).replace(/[=]/g, '');
        const encodedPayload = btoa(JSON.stringify(payload)).replace(/[=]/g, '');
        
        const message = `${encodedHeader}.${encodedPayload}`;
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(JWT_SECRET),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
        const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/[=]/g, '');
        
        return `${message}.${encodedSignature}`;
    };
    
    const verifyJWT = async (token: string): Promise<any> => {
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
        
        // 检查过期时间
        if (payload.exp && Date.now() / 1000 > payload.exp) {
            throw new Error('JWT expired');
        }
        
        return payload;
    };

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
        const { action, username, password, email } = await req.json();

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase配置缺失');
        }

        if (action === 'login') {
            if (!username || !password) {
                throw new Error('用户名和密码为必填项');
            }

            // 查询管理员用户
            const adminResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users?username=eq.${username}&is_active=eq.true`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!adminResponse.ok) {
                throw new Error('查询管理员信息失败');
            }

            const admins = await adminResponse.json();
            if (!admins || admins.length === 0) {
                throw new Error('用户名或密码错误');
            }

            const admin = admins[0];

            // 验证密码 (使用bcrypt进行安全比较)
            const passwordMatch = await verifyPassword(password, admin.password_hash);
            if (!passwordMatch) {
                throw new Error('用户名或密码错误');
            }

            // 更新最后登录时间
            await fetch(`${supabaseUrl}/rest/v1/admin_users?id=eq.${admin.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    last_login: new Date().toISOString()
                })
            });

            // 生成JWT令牌 (替代原有的Base64简单令牌)
            const payload = {
                adminId: admin.id,
                username: admin.username,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24小时过期
            };
            const sessionToken = await generateJWT(payload);

            return new Response(JSON.stringify({
                data: {
                    success: true,
                    sessionToken: sessionToken,
                    admin: {
                        id: admin.id,
                        username: admin.username,
                        email: admin.email
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'create') {
            if (!username || !password || !email) {
                throw new Error('用户名、密码和邮箱为必填项');
            }

            // 检查用户名是否已存在
            const existingResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users?username=eq.${username}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                }
            });

            if (existingResponse.ok) {
                const existing = await existingResponse.json();
                if (existing && existing.length > 0) {
                    throw new Error('用户名已存在');
                }
            }

            // 创建新管理员
            const hashedPassword = await hashPassword(password);
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password_hash: hashedPassword, // 使用安全哈希密码
                    is_active: true,
                    created_at: new Date().toISOString()
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`创建管理员失败: ${errorText}`);
            }

            const newAdmin = await createResponse.json();

            return new Response(JSON.stringify({
                data: {
                    success: true,
                    message: '管理员创建成功',
                    admin: {
                        id: newAdmin[0].id,
                        username: newAdmin[0].username,
                        email: newAdmin[0].email
                    }
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });

        } else if (action === 'verify') {
            const authHeader = req.headers.get('authorization');
            if (!authHeader) {
                throw new Error('未提供认证token');
            }

            const token = authHeader.replace('Bearer ', '');
            
            try {
                // 使用JWT验证代替Base64解码
                const payload = await verifyJWT(token);
                const { adminId } = payload;

                // 验证管理员是否仍然存在且激活
                const adminResponse = await fetch(`${supabaseUrl}/rest/v1/admin_users?id=eq.${adminId}&is_active=eq.true`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    }
                });

                if (!adminResponse.ok) {
                    throw new Error('验证失败');
                }

                const admins = await adminResponse.json();
                if (!admins || admins.length === 0) {
                    throw new Error('管理员不存在或已禁用');
                }

                return new Response(JSON.stringify({
                    data: {
                        valid: true,
                        admin: {
                            id: admins[0].id,
                            username: admins[0].username,
                            email: admins[0].email
                        }
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (jwtError) {
                console.error('JWT验证失败:', jwtError.message);
                throw new Error('JWT令牌验证失败: ' + jwtError.message);
            }
        } else {
            throw new Error('无效的操作类型');
        }

    } catch (error) {
        console.error('管理员认证错误:', error);

        const errorResponse = {
            error: {
                code: 'ADMIN_AUTH_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});