// Vercel PostgreSQL 데이터베이스 연결 및 관리
const { sql } = require('@vercel/postgres');

class DatabaseManager {
    constructor() {
        // Vercel PostgreSQL은 자동으로 환경변수를 통해 연결됩니다
    }

    // 데이터베이스 초기화 (테이블 생성)
    async initializeDatabase() {
        try {
            console.log('🗄️ 데이터베이스 초기화 시작...');

            // 사용자 테이블 생성
            await sql`
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    profile_picture TEXT,
                    provider VARCHAR(50) DEFAULT 'email',
                    provider_id VARCHAR(255),
                    password_hash VARCHAR(255),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP WITH TIME ZONE
                )
            `;

            // 저장된 맛집 테이블 생성
            await sql`
                CREATE TABLE IF NOT EXISTS saved_restaurants (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    restaurant_id VARCHAR(255) NOT NULL,
                    restaurant_name VARCHAR(255) NOT NULL,
                    restaurant_area VARCHAR(255),
                    restaurant_category VARCHAR(255),
                    restaurant_data JSONB,
                    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(user_id, restaurant_id)
                )
            `;

            // 사용자 활동 로그 테이블 생성
            await sql`
                CREATE TABLE IF NOT EXISTS user_activity_logs (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    action VARCHAR(100) NOT NULL,
                    details JSONB,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // 인덱스 생성
            await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
            await sql`CREATE INDEX IF NOT EXISTS idx_saved_restaurants_user_id ON saved_restaurants(user_id)`;
            await sql`CREATE INDEX IF NOT EXISTS idx_saved_restaurants_restaurant_id ON saved_restaurants(restaurant_id)`;

            console.log('✅ 데이터베이스 초기화 완료');
        } catch (error) {
            console.error('❌ 데이터베이스 초기화 실패:', error);
            throw error;
        }
    }

    // 사용자 생성 또는 업데이트 (OAuth 로그인용)
    async upsertUser(userData) {
        try {
            const { email, name, profilePicture, provider, providerId } = userData;

            const result = await sql`
                INSERT INTO users (email, name, profile_picture, provider, provider_id, last_login)
                VALUES (${email}, ${name}, ${profilePicture || null}, ${provider}, ${providerId || null}, CURRENT_TIMESTAMP)
                ON CONFLICT (email)
                DO UPDATE SET
                    name = EXCLUDED.name,
                    profile_picture = COALESCE(EXCLUDED.profile_picture, users.profile_picture),
                    last_login = CURRENT_TIMESTAMP
                RETURNING id, email, name, profile_picture, provider, created_at
            `;

            return result.rows[0];
        } catch (error) {
            console.error('사용자 생성/업데이트 실패:', error);
            throw error;
        }
    }

    // 이메일로 사용자 조회
    async getUserByEmail(email) {
        try {
            const result = await sql`
                SELECT id, email, name, profile_picture, provider, created_at
                FROM users
                WHERE email = ${email}
            `;

            return result.rows[0] || null;
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            throw error;
        }
    }

    // 사용자 ID로 사용자 조회
    async getUserById(userId) {
        try {
            const result = await sql`
                SELECT id, email, name, profile_picture, provider, created_at
                FROM users
                WHERE id = ${userId}
            `;

            return result.rows[0] || null;
        } catch (error) {
            console.error('사용자 조회 실패:', error);
            throw error;
        }
    }

    // 맛집 저장
    async saveRestaurant(userId, restaurantData) {
        try {
            const { id, name, area, category } = restaurantData;

            const result = await sql`
                INSERT INTO saved_restaurants (user_id, restaurant_id, restaurant_name, restaurant_area, restaurant_category, restaurant_data)
                VALUES (${userId}, ${id}, ${name}, ${area}, ${category}, ${JSON.stringify(restaurantData)})
                ON CONFLICT (user_id, restaurant_id) DO NOTHING
                RETURNING id, saved_at
            `;

            // 활동 로그 기록
            await this.logUserActivity(userId, 'save_restaurant', {
                restaurant_id: id,
                restaurant_name: name
            });

            return result.rows[0];
        } catch (error) {
            console.error('맛집 저장 실패:', error);
            throw error;
        }
    }

    // 맛집 저장 해제
    async unsaveRestaurant(userId, restaurantId) {
        try {
            const result = await sql`
                DELETE FROM saved_restaurants
                WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
                RETURNING restaurant_name
            `;

            // 활동 로그 기록
            if (result.rows[0]) {
                await this.logUserActivity(userId, 'remove_restaurant', {
                    restaurant_id: restaurantId,
                    restaurant_name: result.rows[0].restaurant_name
                });
            }

            return result.rowCount > 0;
        } catch (error) {
            console.error('맛집 저장 해제 실패:', error);
            throw error;
        }
    }

    // 사용자의 저장된 맛집 목록 조회
    async getSavedRestaurants(userId) {
        try {
            const result = await sql`
                SELECT restaurant_data, saved_at
                FROM saved_restaurants
                WHERE user_id = ${userId}
                ORDER BY saved_at DESC
            `;

            return result.rows.map(row => ({
                ...row.restaurant_data,
                savedAt: row.saved_at
            }));
        } catch (error) {
            console.error('저장된 맛집 조회 실패:', error);
            throw error;
        }
    }

    // 맛집이 사용자에 의해 저장되었는지 확인
    async isRestaurantSaved(userId, restaurantId) {
        try {
            const result = await sql`
                SELECT 1 FROM saved_restaurants
                WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}
            `;

            return result.rowCount > 0;
        } catch (error) {
            console.error('맛집 저장 상태 확인 실패:', error);
            throw error;
        }
    }

    // 사용자 활동 로그 기록
    async logUserActivity(userId, action, details = {}) {
        try {
            await sql`
                INSERT INTO user_activity_logs (user_id, action, details)
                VALUES (${userId}, ${action}, ${JSON.stringify(details)})
            `;
        } catch (error) {
            console.error('활동 로그 기록 실패:', error);
            // 로그 실패는 주요 기능에 영향을 주지 않도록 에러를 던지지 않습니다
        }
    }

    // 사용자 통계 조회
    async getUserStats(userId) {
        try {
            const savedCount = await sql`
                SELECT COUNT(*) as count FROM saved_restaurants WHERE user_id = ${userId}
            `;

            const activityCount = await sql`
                SELECT COUNT(*) as count FROM user_activity_logs WHERE user_id = ${userId}
            `;

            return {
                savedRestaurantsCount: parseInt(savedCount.rows[0].count),
                totalActivities: parseInt(activityCount.rows[0].count)
            };
        } catch (error) {
            console.error('사용자 통계 조회 실패:', error);
            throw error;
        }
    }
}

module.exports = new DatabaseManager();