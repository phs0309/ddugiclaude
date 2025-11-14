-- conversation_sessions 테이블 생성
CREATE TABLE conversation_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '새 대화',
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false
);

-- 인덱스 추가
CREATE INDEX idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX idx_conversation_sessions_session_id ON conversation_sessions(session_id);
CREATE INDEX idx_conversation_sessions_last_message_at ON conversation_sessions(last_message_at DESC);

-- RLS 정책 설정
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 대화만 볼 수 있음
CREATE POLICY "Users can view own conversation sessions" ON conversation_sessions
    FOR SELECT USING (user_id = auth.uid());

-- 사용자는 자신의 대화만 삽입할 수 있음
CREATE POLICY "Users can insert own conversation sessions" ON conversation_sessions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 사용자는 자신의 대화만 업데이트할 수 있음
CREATE POLICY "Users can update own conversation sessions" ON conversation_sessions
    FOR UPDATE USING (user_id = auth.uid());

-- 사용자는 자신의 대화만 삭제할 수 있음
CREATE POLICY "Users can delete own conversation sessions" ON conversation_sessions
    FOR DELETE USING (user_id = auth.uid());

-- conversations 테이블에 session 관리 기능 추가
-- (기존 테이블 구조 확인용)
-- 이미 존재하는 conversations 테이블의 구조:
/*
CREATE TABLE conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'chat',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
*/