-- 대화 관련 테이블 생성 (완전한 스키마)

-- 1. 먼저 users 테이블이 UUID를 사용하는지 확인하고, 필요하면 수정
-- 현재 users 테이블 구조 확인용 쿼리 (실행 전 확인 필요)
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND table_schema = 'public';

-- 2. conversations 테이블 생성 (메시지 저장용)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. conversation_sessions 테이블 생성 (대화 세션 관리용)
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '새 대화',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false
);

-- 4. 인덱스 생성
-- conversations 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- conversation_sessions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message_at ON conversation_sessions(last_message_at DESC);

-- 5. RLS (Row Level Security) 정책 설정
-- conversations 테이블 RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own conversations" ON conversations
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own conversations" ON conversations
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own conversations" ON conversations
    FOR DELETE USING (user_id = auth.uid());

-- conversation_sessions 테이블 RLS
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view own conversation sessions" ON conversation_sessions
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can insert own conversation sessions" ON conversation_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update own conversation sessions" ON conversation_sessions
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can delete own conversation sessions" ON conversation_sessions
    FOR DELETE USING (user_id = auth.uid());

-- 6. 사용자 데이터 유형이 다를 경우 대안 (INTEGER 기반)
-- 만약 기존 users.id가 INTEGER라면 아래 테이블을 대신 사용:

/*
-- conversations 테이블 (INTEGER user_id 버전)
CREATE TABLE IF NOT EXISTS conversations_alt (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- conversation_sessions 테이블 (INTEGER user_id 버전)
CREATE TABLE IF NOT EXISTS conversation_sessions_alt (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '새 대화',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false
);
*/