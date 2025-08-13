-- Migration: setup_admin_profiles
-- Created at: 1755057045

-- Create admin profiles table
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  role VARCHAR(20) DEFAULT 'admin',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create RLS policies for admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Allow admins to read their own profile
CREATE POLICY "Admins can view own profile" ON admin_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow admins to update their own profile
CREATE POLICY "Admins can update own profile" ON admin_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles 
    WHERE id = user_id AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;