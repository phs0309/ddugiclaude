-- 뚜기 부산 맛집 앱 데이터베이스 스키마

-- 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    provider VARCHAR(50) DEFAULT 'email', -- 'email', 'google', 'kakao'
    provider_id VARCHAR(255),
    password_hash VARCHAR(255), -- 이메일 로그인용
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE
);

-- 저장된 맛집 테이블
CREATE TABLE IF NOT EXISTS saved_restaurants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    restaurant_id VARCHAR(255) NOT NULL, -- restaurants.json의 ID
    restaurant_name VARCHAR(255) NOT NULL,
    restaurant_area VARCHAR(255),
    restaurant_category VARCHAR(255),
    restaurant_data JSONB, -- 전체 맛집 정보를 JSON으로 저장
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, restaurant_id)
);

-- 사용자 활동 로그 테이블 (선택사항)
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'login', 'search', 'save_restaurant', 'remove_restaurant'
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_saved_restaurants_user_id ON saved_restaurants(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_restaurants_restaurant_id ON saved_restaurants(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_action ON user_activity_logs(action);

-- 업데이트 트리거 (updated_at 자동 갱신)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();