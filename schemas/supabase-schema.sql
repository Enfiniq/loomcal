-- LoomCal Supabase Database Schema
-- Run this in your Supabase SQL editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Migration: Drop old api_usage table if it exists (replace with api_usage_logs)
DROP TABLE IF EXISTS api_usage CASCADE;

-- Organization owners/admins table
CREATE TABLE IF NOT EXISTS organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- For email/password login
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'admin', -- admin, owner
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100), -- Brand asset/icon for the organization
    owner_id UUID NOT NULL REFERENCES organization_users(id) ON DELETE RESTRICT,
    is_active BOOLEAN DEFAULT true, -- Organization active status
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE, -- SHA-256 hash of the actual API key
    key_prefix VARCHAR(20) NOT NULL, -- First 8 characters for identification
    permissions JSONB DEFAULT '{"events": {"read": true, "write": true, "delete": true}, "users": {"read": true, "write": true, "delete": true}}',
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Users table (for LoomCal app users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255), -- For email/password login
    name VARCHAR(255),
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Org customers table (for external users tracked via API)
CREATE TABLE IF NOT EXISTS org_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    identifier VARCHAR(255) NOT NULL, -- The unique identifier within the org (email, username, etc.)
    composite_id VARCHAR(512) NOT NULL UNIQUE, -- orgname_identifier format
    name VARCHAR(255),
    email VARCHAR(255),
    custom_data JSONB DEFAULT '{}', -- Changed from data to custom_data for consistency
    linked_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- If they sign up to LoomCal later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE (organization_id, identifier)
);

-- User events table (for LoomCal app users' personal calendar)
CREATE TABLE IF NOT EXISTS user_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    repeat VARCHAR(50), -- daily, weekly, monthly, yearly
    color VARCHAR(10),
    type VARCHAR(100),
    location TEXT,
    attendees JSONB DEFAULT '[]',
    reminders JSONB DEFAULT '[]',
    icon VARCHAR(100), -- icon id from icon table
    resource TEXT, -- website, yt video, or any resource
    custom_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Org events table (events tracked via API for external users)
CREATE TABLE IF NOT EXISTS org_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    org_customer_id UUID NOT NULL REFERENCES org_customers(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL, -- Added default to now()
    end_time TIMESTAMP WITH TIME ZONE,
    repeat VARCHAR(50),
    type VARCHAR(50),
    color VARCHAR(10),
    resource TEXT, -- website, yt video, or any resource
    custom_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- API usage logs tracking table
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    response_time_ms INTEGER,
    status_code INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    operations_count INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_api_keys_organization_id ON api_keys(organization_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

-- Org events indexes
CREATE INDEX IF NOT EXISTS idx_org_events_organization_id ON org_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_events_org_customer_id ON org_events(org_customer_id);
CREATE INDEX IF NOT EXISTS idx_org_events_start_time ON org_events(start_time);
CREATE INDEX IF NOT EXISTS idx_org_events_end_time ON org_events(end_time);

-- User events indexes
CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_start_time ON user_events(start_time);
CREATE INDEX IF NOT EXISTS idx_user_events_end_time ON user_events(end_time);

-- Org customers indexes
CREATE INDEX IF NOT EXISTS idx_org_customers_organization_id ON org_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_customers_composite_id ON org_customers(composite_id);
CREATE INDEX IF NOT EXISTS idx_org_customers_identifier ON org_customers(organization_id, identifier);
CREATE INDEX IF NOT EXISTS idx_org_customers_linked_user ON org_customers(linked_user_id) WHERE linked_user_id IS NOT NULL;

-- API usage logs indexes
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_status_code ON api_usage_logs(status_code);

-- Indexes for authentication tables
CREATE INDEX IF NOT EXISTS idx_organization_users_email ON organization_users(email);
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON organizations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security (RLS) policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policies to allow service role access (needed for API operations)
-- Allow service role to access all tables (service role bypasses RLS by default, but this is explicit)

-- Organization Users policies
DROP POLICY IF EXISTS "Service role can manage organization_users" ON organization_users;
CREATE POLICY "Service role can manage organization_users" ON organization_users
    FOR ALL USING (true) WITH CHECK (true);

-- Organizations policies  
DROP POLICY IF EXISTS "Service role can manage organizations" ON organizations;
CREATE POLICY "Service role can manage organizations" ON organizations
    FOR ALL USING (true) WITH CHECK (true);

-- API Keys policies
DROP POLICY IF EXISTS "Service role can manage api_keys" ON api_keys;
CREATE POLICY "Service role can manage api_keys" ON api_keys
    FOR ALL USING (true) WITH CHECK (true);

-- Users policies
DROP POLICY IF EXISTS "Service role can manage users" ON users;
CREATE POLICY "Service role can manage users" ON users
    FOR ALL USING (true) WITH CHECK (true);

-- Org customers policies
DROP POLICY IF EXISTS "Service role can manage org_customers" ON org_customers;
CREATE POLICY "Service role can manage org_customers" ON org_customers
    FOR ALL USING (true) WITH CHECK (true);

-- Org events policies
DROP POLICY IF EXISTS "Service role can manage org_events" ON org_events;
CREATE POLICY "Service role can manage org_events" ON org_events
    FOR ALL USING (true) WITH CHECK (true);

-- User events policies
DROP POLICY IF EXISTS "Service role can manage user_events" ON user_events;
CREATE POLICY "Service role can manage user_events" ON user_events
    FOR ALL USING (true) WITH CHECK (true);

-- API Usage Logs policies
DROP POLICY IF EXISTS "Service role can manage api_usage_logs" ON api_usage_logs;
CREATE POLICY "Service role can manage api_usage_logs" ON api_usage_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;

$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_org_events_updated_at ON org_events;
CREATE TRIGGER update_org_events_updated_at BEFORE UPDATE ON org_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_user_events_updated_at ON user_events;
CREATE TRIGGER update_user_events_updated_at BEFORE UPDATE ON user_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_organization_users_updated_at ON organization_users;
CREATE TRIGGER update_organization_users_updated_at BEFORE UPDATE ON organization_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_org_customers_updated_at ON org_customers;
CREATE TRIGGER update_org_customers_updated_at BEFORE UPDATE ON org_customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Schema setup complete!
-- Organizations and users will be created through the signup API endpoint
-- API keys will be generated automatically when organizations are created
