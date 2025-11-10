// 사용자 저장 맛집 관리 API
import { sql } from '@vercel/postgres';

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 토큰에서 사용자 정보 추출
        const authHeader = req.headers.authorization;
        let user = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            try {
                const payload = JSON.parse(Buffer.from(token, 'base64').toString());
                user = payload;
            } catch (e) {
                console.error('토큰 파싱 오류:', e);
            }
        }

        // 로그인하지 않은 사용자는 로그인 요구
        if (!user || user.isGuest) {
            return res.status(401).json({
                error: '로그인이 필요한 기능입니다',
                code: 'AUTHENTICATION_REQUIRED',
                message: 'Google 로그인 또는 회원가입 후 이용해주세요'
            });
        }

        // 데이터베이스 테이블 초기화 (존재하지 않으면 생성)
        try {
            await initializeTables();
        } catch (dbError) {
            console.error('데이터베이스 초기화 실패:', dbError);
            // 데이터베이스 연결 실패
            return res.status(503).json({
                error: '데이터베이스 연결에 실패했습니다',
                code: 'DATABASE_CONNECTION_FAILED',
                message: '잠시 후 다시 시도해주세요. 문제가 지속되면 관리자에게 문의해주세요.',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }

        if (req.method === 'GET') {
            // 저장된 맛집 조회
            try {
                const result = await sql`
                    SELECT restaurant_data, saved_at 
                    FROM user_restaurants 
                    WHERE user_id = ${user.userId || user.email}
                    ORDER BY saved_at DESC
                `;

                const restaurants = result.rows.map(row => ({
                    ...row.restaurant_data,
                    savedAt: row.saved_at
                }));

                return res.status(200).json({
                    success: true,
                    restaurants: restaurants,
                    count: restaurants.length,
                    isGuest: false
                });
            } catch (dbError) {
                console.error('저장된 맛집 조회 실패:', dbError);
                return res.status(500).json({
                    error: '저장된 맛집 조회 중 오류가 발생했습니다',
                    code: 'DATABASE_QUERY_FAILED',
                    message: '잠시 후 다시 시도해주세요',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                });
            }

        } else if (req.method === 'POST') {
            // 맛집 저장
            const { restaurant } = req.body;

            if (!restaurant || !restaurant.id) {
                return res.status(400).json({
                    error: '저장할 맛집 정보가 필요합니다',
                    code: 'MISSING_RESTAURANT_DATA'
                });
            }

            try {
                // 중복 체크
                const existing = await sql`
                    SELECT id FROM user_restaurants 
                    WHERE user_id = ${user.userId || user.email} 
                    AND restaurant_data->>'id' = ${restaurant.id}
                `;

                if (existing.rows.length > 0) {
                    return res.status(400).json({
                        error: '이미 저장된 맛집입니다',
                        code: 'ALREADY_SAVED'
                    });
                }

                // 저장
                const restaurantData = {
                    ...restaurant,
                    savedAt: new Date().toISOString()
                };

                await sql`
                    INSERT INTO user_restaurants (user_id, restaurant_data, saved_at)
                    VALUES (${user.userId || user.email}, ${JSON.stringify(restaurantData)}, NOW())
                `;

                return res.status(200).json({
                    success: true,
                    message: `"${restaurant.name}"을(를) 저장했습니다`,
                    restaurant: restaurantData,
                    isGuest: false
                });
            } catch (dbError) {
                console.error('맛집 저장 실패:', dbError);
                return res.status(500).json({
                    error: '맛집 저장 중 오류가 발생했습니다',
                    code: 'DATABASE_INSERT_FAILED',
                    message: '잠시 후 다시 시도해주세요',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                });
            }

        } else if (req.method === 'DELETE') {
            // 맛집 저장 해제
            const { restaurantId } = req.query;

            if (!restaurantId) {
                return res.status(400).json({
                    error: '삭제할 맛집 ID가 필요합니다',
                    code: 'MISSING_RESTAURANT_ID'
                });
            }

            try {
                const result = await sql`
                    DELETE FROM user_restaurants 
                    WHERE user_id = ${user.userId || user.email} 
                    AND restaurant_data->>'id' = ${restaurantId}
                    RETURNING restaurant_data->>'name' as name
                `;

                if (result.rows.length === 0) {
                    return res.status(404).json({
                        error: '저장된 맛집을 찾을 수 없습니다',
                        code: 'NOT_FOUND'
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: '맛집을 저장 목록에서 제거했습니다',
                    restaurantId: restaurantId,
                    isGuest: false
                });
            } catch (dbError) {
                console.error('맛집 삭제 실패:', dbError);
                return res.status(500).json({
                    error: '맛집 삭제 중 오류가 발생했습니다',
                    code: 'DATABASE_DELETE_FAILED',
                    message: '잠시 후 다시 시도해주세요',
                    details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
                });
            }

        } else {
            return res.status(405).json({
                error: '지원하지 않는 메소드입니다',
                code: 'METHOD_NOT_ALLOWED'
            });
        }

    } catch (error) {
        console.error('사용자 맛집 API 오류:', error);
        
        // 데이터베이스 연결 오류인 경우 게스트 모드로 폴백
        if (error.message && error.message.includes('connect')) {
            return res.status(200).json({
                isGuest: true,
                restaurants: [],
                count: 0,
                fallback: true,
                message: '데이터베이스 연결 실패, 로컬스토리지를 사용해주세요'
            });
        }

        return res.status(500).json({
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// 데이터베이스 테이블 초기화
async function initializeTables() {
    try {
        // 사용자 테이블 생성 (존재하지 않으면)
        await sql`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                profile_picture TEXT,
                provider VARCHAR(50) DEFAULT 'google',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        // 사용자 맛집 테이블 생성 (존재하지 않으면)
        await sql`
            CREATE TABLE IF NOT EXISTS user_restaurants (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                restaurant_data JSONB NOT NULL,
                saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, restaurant_data->>'id')
            )
        `;

        // 인덱스 생성 (성능 향상)
        await sql`
            CREATE INDEX IF NOT EXISTS idx_user_restaurants_user_id 
            ON user_restaurants(user_id)
        `;

        await sql`
            CREATE INDEX IF NOT EXISTS idx_user_restaurants_restaurant_id 
            ON user_restaurants USING GIN ((restaurant_data->>'id'))
        `;

        console.log('데이터베이스 테이블 초기화 완료');
    } catch (error) {
        console.error('테이블 초기화 오류:', error);
        throw error;
    }
}