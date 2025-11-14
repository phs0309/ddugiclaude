-- 대화 관련 테이블 생성 (INTEGER user_id 기반)

-- 1. conversations 테이블 생성 (메시지 저장용)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. conversation_sessions 테이블 생성 (대화 세션 관리용)
CREATE TABLE IF NOT EXISTS conversation_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT '새 대화',
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_archived BOOLEAN DEFAULT false,
    is_favorite BOOLEAN DEFAULT false
);

-- 3. 인덱스 생성
-- conversations 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

-- conversation_sessions 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_session_id ON conversation_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_last_message_at ON conversation_sessions(last_message_at DESC);

-- 4. RLS 정책은 Service Role Key 사용시 비활성화
-- 현재 Service Role Key를 사용하므로 RLS 정책 없이 애플리케이션에서 직접 제어