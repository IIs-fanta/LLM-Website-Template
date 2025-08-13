# 世界上最聪明的人工智能 - 管理员使用手册
<img width="1287" height="1267" alt="image" src="https://github.com/user-attachments/assets/1429c715-8437-4c34-b31f-cda8f4c66432" />
<img width="1382" height="492" alt="image" src="https://github.com/user-attachments/assets/0b0a0344-ab5a-49b8-8d84-345b61606edf" />

## 📝 目录

1. [管理员后台访问](#管理员后台访问)
2. [API配置功能详解](#api配置功能详解)
3. [自定义API Host功能](#自定义api-host功能)
4. [使用示例](#使用示例)
5. [常见问题](#常见问题)

---

## 🔐 管理员后台访问

### 登录信息

- **后台地址**: 
- **默认账号**:
- **默认密码**: 

### 访问步骤

1. **直接访问**: 在浏览器输入管理员登录地址
2. **从主页导航**: 在主页URL后添加 `/admin/login`
3. 输入用户名和密码进行登录
4. 登录成功后将进入管理员控制台

---

## ⚙️ API配置功能详解

### 功能概述

管理员可以在后台配置多个AI服务提供商，系统支持：
- OpenAI (GPT系列模型)
- Claude (Anthropic)
- 自定义AI服务

### 配置字段说明

#### 1. API提供商
- **OpenAI**: 自动填充OpenAI的默认配置
- **Claude**: 自动填充Claude的默认配置
- **自定义**: 允许完全自定义配置

#### 2. API Host (基础URL) **🆕新功能**
- **用途**: 设置AI服务的基础URL地址
- **自动填充**: 选择提供商时会自动填充默认Host
- **自定义支持**: 支持使用代理服务或私有部署的API

#### 3. API密钥
- 从AI服务提供商获取的认证密钥
- 必填字段，用于API调用认证

#### 4. 模型名称
- 指定要使用的AI模型
- 根据提供商自动填充推荐模型

#### 5. API端点 (可选)
- 完整的API调用地址
- 如果设置，将覆盖Host+路径的组合

---

## 🌐 自定义API Host功能

### 功能特点

#### 智能默认填充
选择不同的API提供商时，系统会自动填充对应的默认Host：

- **OpenAI**: `https://api.openai.com`
- **Claude**: `https://api.anthropic.com`
- **自定义**: 空白，需要手动填入

#### 优先级规则

系统按以下优先级确定API调用地址：

1. **最高优先级**: API端点（如果设置）
2. **中等优先级**: API Host + 标准路径
   - OpenAI: `{api_host}/v1/chat/completions`
   - Claude: `{api_host}/v1/messages`
3. **默认优先级**: 官方默认地址

#### 使用场景

##### 1. 使用代理服务
```
API Host: https://your-proxy.example.com
```

##### 2. 私有部署
```
API Host: https://internal-ai.company.com
```

##### 3. 区域特定服务
```
API Host: https://api-eu.openai.com
```

##### 4. 自定义API网关
```
API Host: https://gateway.yourservice.com
```

---

## 📖 使用示例

### 示例1: 配置标准OpenAI

```
API提供商: OpenAI
API Host: https://api.openai.com (自动填充)
API密钥: sk-your-actual-openai-key
模型名称: gpt-3.5-turbo (自动填充)
```

### 示例2: 配置OpenAI代理

```
API提供商: OpenAI
API Host: https://your-openai-proxy.com
API密钥: sk-your-actual-openai-key
模型名称: gpt-3.5-turbo
```

### 示例3: 配置Claude

```
API提供商: Claude
API Host: https://api.anthropic.com (自动填充)
API密钥: sk-ant-your-claude-key
模型名称: claude-3-sonnet-20240229 (自动填充)
```

### 示例4: 自定义API服务

```
API提供商: 自定义
API Host: https://your-custom-ai.com
API密钥: your-custom-api-key
模型名称: your-model-name
API端点: https://your-custom-ai.com/v1/chat (可选)
```

---

## ❓ 常见问题

### Q1: API Host和API端点有什么区别？

**A**: 
- **API Host**: 基础URL，系统会自动拼接标准路径
- **API端点**: 完整的API调用地址，优先级更高

### Q2: 如何测试API配置是否正确？

**A**: 
1. 保存API配置后，确保设置为"激活"状态
2. 在主页面尝试发送测试消息
3. 查看对话记录页面确认API调用是否成功

### Q3: 支持哪些AI服务提供商？

**A**: 
- 官方支持：OpenAI、Claude
- 通过"自定义"选项支持任何兼容OpenAI格式的API服务

### Q4: 可以同时配置多个API吗？

**A**: 
- 可以配置多个API配置
- 系统会使用最新创建的"激活"状态的配置

### Q5: 如何使用代理服务？

**A**: 
1. 选择对应的提供商（如OpenAI）
2. 将API Host改为你的代理地址
3. 保持API密钥和模型名称不变

---

## 🔧 技术支持

如遇到技术问题，请检查：

1. **API密钥**: 确保密钥有效且有足够额度
2. **网络连接**: 确保服务器能访问API Host地址
3. **模型名称**: 确保模型名称正确且可用
4. **配置状态**: 确保API配置处于"激活"状态

---

**更新日期**: 2025-08-13  
**版本**: v2.0 - 新增自定义API Host功能
