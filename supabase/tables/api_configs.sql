CREATE TABLE api_configs (
    id SERIAL PRIMARY KEY,
    api_provider VARCHAR(50) NOT NULL,
    api_key TEXT NOT NULL,
    api_endpoint VARCHAR(255),
    model_name VARCHAR(100),
    parameters JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);