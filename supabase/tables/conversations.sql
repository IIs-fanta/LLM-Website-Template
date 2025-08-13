CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    session_id VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL CHECK (message_type IN ('user',
    'assistant')),
    message_content TEXT NOT NULL,
    api_provider_used VARCHAR(50),
    model_used VARCHAR(100),
    tokens_used INTEGER,
    response_time INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);