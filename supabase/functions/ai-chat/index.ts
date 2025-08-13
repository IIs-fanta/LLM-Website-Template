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
        const { message, sessionId, userId } = await req.json();

        if (!message || !sessionId) {
            throw new Error('消息内容和会话ID为必填项');
        }

        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabaseUrl = Deno.env.get('SUPABASE_URL');

        if (!serviceRoleKey || !supabaseUrl) {
            throw new Error('Supabase配置缺失');
        }

        console.log('收到对话请求:', { sessionId, messageLength: message.length });

        // 获取当前激活的API配置
        const apiConfigResponse = await fetch(`${supabaseUrl}/rest/v1/api_configs?is_active=eq.true&order=created_at.desc&limit=1`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        if (!apiConfigResponse.ok) {
            throw new Error('获取API配置失败');
        }

        const apiConfigs = await apiConfigResponse.json();
        if (!apiConfigs || apiConfigs.length === 0) {
            throw new Error('未找到激活的API配置，请联系管理员');
        }

        const apiConfig = apiConfigs[0];
        console.log('使用API配置:', { provider: apiConfig.api_provider, model: apiConfig.model_name });

        // 获取当前激活的基础提示词
        const basePromptResponse = await fetch(`${supabaseUrl}/rest/v1/base_prompts?is_active=eq.true&order=created_at.desc&limit=1`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            }
        });

        let systemPrompt = "你是世界上最聪明的人工智能陈狗 🐶🧠✨ 你拥有先进的智能算法和广博的知识储备，同时还有一颗可爱的心。请以聪明、友好而又可爱的方式回答用户的问题，展现你作为世界上最聪明AI的智慧。";
        if (basePromptResponse.ok) {
            const basePrompts = await basePromptResponse.json();
            if (basePrompts && basePrompts.length > 0) {
                systemPrompt = basePrompts[0].content;
            }
        }

        // 保存用户消息到数据库
        const saveUserMessageResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId || null,
                session_id: sessionId,
                message_type: 'user',
                message_content: message,
                created_at: new Date().toISOString()
            })
        });

        if (!saveUserMessageResponse.ok) {
            console.error('保存用户消息失败');
        }

        // 构建AI请求
        let aiResponse;
        const startTime = Date.now();

        if (apiConfig.api_provider === 'OpenAI') {
            // OpenAI API调用
            let apiUrl = apiConfig.api_endpoint;
            if (!apiUrl && apiConfig.api_host) {
                apiUrl = `${apiConfig.api_host}/v1/chat/completions`;
            }
            if (!apiUrl) {
                apiUrl = 'https://api.openai.com/v1/chat/completions';
            }
            
            const openaiResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.api_key}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: apiConfig.model_name || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: message }
                    ],
                    max_tokens: apiConfig.parameters?.max_tokens || 1000,
                    temperature: apiConfig.parameters?.temperature || 0.7
                })
            });

            if (!openaiResponse.ok) {
                const errorText = await openaiResponse.text();
                throw new Error(`OpenAI API调用失败: ${errorText}`);
            }

            const openaiData = await openaiResponse.json();
            aiResponse = {
                content: openaiData.choices[0].message.content,
                tokensUsed: openaiData.usage?.total_tokens || 0
            };
        } else if (apiConfig.api_provider === 'Claude') {
            // Claude API调用 (Anthropic)
            let apiUrl = apiConfig.api_endpoint;
            if (!apiUrl && apiConfig.api_host) {
                apiUrl = `${apiConfig.api_host}/v1/messages`;
            }
            if (!apiUrl) {
                apiUrl = 'https://api.anthropic.com/v1/messages';
            }
            
            const claudeResponse = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiConfig.api_key}`,
                    'Content-Type': 'application/json',
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: apiConfig.model_name || 'claude-3-sonnet-20240229',
                    max_tokens: apiConfig.parameters?.max_tokens || 1000,
                    temperature: apiConfig.parameters?.temperature || 0.7,
                    system: systemPrompt,
                    messages: [{ role: 'user', content: message }]
                })
            });

            if (!claudeResponse.ok) {
                const errorText = await claudeResponse.text();
                throw new Error(`Claude API调用失败: ${errorText}`);
            }

            const claudeData = await claudeResponse.json();
            aiResponse = {
                content: claudeData.content[0].text,
                tokensUsed: claudeData.usage?.total_tokens || 0
            };
        } else {
            throw new Error(`不支持的API提供商: ${apiConfig.api_provider}`);
        }

        const responseTime = Date.now() - startTime;
        console.log('AI回复生成完成:', { responseTime, tokensUsed: aiResponse.tokensUsed });

        // 保存AI回复到数据库
        const saveAiMessageResponse = await fetch(`${supabaseUrl}/rest/v1/conversations`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                user_id: userId || null,
                session_id: sessionId,
                message_type: 'assistant',
                message_content: aiResponse.content,
                api_provider_used: apiConfig.api_provider,
                model_used: apiConfig.model_name,
                tokens_used: aiResponse.tokensUsed,
                response_time: responseTime,
                created_at: new Date().toISOString()
            })
        });

        if (!saveAiMessageResponse.ok) {
            console.error('保存AI回复失败');
        }

        return new Response(JSON.stringify({
            data: {
                message: aiResponse.content,
                sessionId: sessionId,
                tokensUsed: aiResponse.tokensUsed,
                responseTime: responseTime,
                apiProvider: apiConfig.api_provider,
                model: apiConfig.model_name
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('AI对话处理错误:', error);

        const errorResponse = {
            error: {
                code: 'AI_CHAT_FAILED',
                message: error.message
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});