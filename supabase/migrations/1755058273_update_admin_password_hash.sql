-- Migration: update_admin_password_hash
-- Created at: 1755058273

-- 更新现有管理员密码为哈希格式
-- 注意：这里使用简化的哈希算法，生产环境应使用bcrypt
UPDATE admin_users 
SET password_hash = encode(sha256((password_hash || 'salt123')::bytea), 'hex')
WHERE username = 'admin' AND password_hash = 'admin123';

-- 确保存在默认管理员账户
INSERT INTO admin_users (username, email, password_hash, is_active, created_at)
SELECT 'admin', 'admin@example.com', encode(sha256(('admin123' || 'salt123')::bytea), 'hex'), true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM admin_users WHERE username = 'admin');;