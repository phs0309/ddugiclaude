// 기본 인증 API (데이터베이스 연동)
import { sql } from '@vercel/postgres';
export default async function handler(req, res) {
    console.log('🚀 Simple Basic Auth API 시작:', { method: req.method, action: req.query?.action });
    
    try {
        // CORS 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }

        const { action } = req.query;
        console.log('🔍 요청된 액션:', action);

        if (action === 'guest-login') {
            // 게스트 토큰 생성
            const guestPayload = {
                userId: null,
                email: 'guest@ddugi.app',
                name: '게스트 사용자',
                provider: 'guest',
                isGuest: true,
                exp: Date.now() + (24 * 60 * 60 * 1000)
            };

            const token = Buffer.from(JSON.stringify(guestPayload)).toString('base64');

            return res.status(200).json({
                success: true,
                token: token,
                user: {
                    id: null,
                    email: 'guest@ddugi.app',
                    name: '게스트 사용자',
                    profilePicture: null,
                    provider: 'guest',
                    isGuest: true
                },
                message: '게스트로 로그인했습니다'
            });
        }

        if (action === 'google-login') {
            // Google 로그인 (간단 버전 - 데이터베이스 없이)
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    error: 'Google ID 토큰이 필요합니다',
                    code: 'MISSING_ID_TOKEN'
                });
            }

            try {
                // Google ID 토큰 검증 및 디코딩
                if (!idToken || typeof idToken !== 'string' || idToken.split('.').length !== 3) {
                    throw new Error('유효하지 않은 Google ID 토큰 형식');
                }

                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = JSON.parse(Buffer.from(base64, 'base64').toString());

                // 필수 필드 검증
                if (!jsonPayload.sub || !jsonPayload.email || !jsonPayload.name) {
                    throw new Error('Google 토큰에 필수 사용자 정보가 없습니다');
                }

                // 데이터베이스에 사용자 정보 저장/업데이트 (안전하게)
                try {
                    console.log('🔍 데이터베이스 연결 시도...');
                    await initializeTables();
                    
                    // 사용자 확인 및 저장
                    const existingUser = await sql`
                        SELECT id, email FROM users WHERE email = ${jsonPayload.email}
                    `;

                    if (existingUser.rows.length === 0) {
                        await sql`
                            INSERT INTO users (email, name, profile_picture, provider)
                            VALUES (${jsonPayload.email}, ${jsonPayload.name}, ${jsonPayload.picture}, 'google')
                        `;
                        console.log('✅ 새 사용자 생성:', jsonPayload.email);
                    } else {
                        await sql`
                            UPDATE users 
                            SET name = ${jsonPayload.name}, 
                                profile_picture = ${jsonPayload.picture},
                                updated_at = CURRENT_TIMESTAMP
                            WHERE email = ${jsonPayload.email}
                        `;
                        console.log('✅ 기존 사용자 정보 업데이트:', jsonPayload.email);
                    }
                    
                    console.log('✅ 데이터베이스 저장 성공');
                } catch (dbError) {
                    console.error('⚠️ 데이터베이스 저장 실패 (로그인은 계속 진행):', dbError);
                    // 데이터베이스 오류가 있어도 로그인은 계속 진행
                }

                const userPayload = {
                    userId: jsonPayload.sub,
                    email: jsonPayload.email,
                    name: jsonPayload.name,
                    provider: 'google',
                    profilePicture: jsonPayload.picture,
                    exp: Date.now() + (7 * 24 * 60 * 60 * 1000)
                };

                const token = Buffer.from(JSON.stringify(userPayload)).toString('base64');

                return res.status(200).json({
                    success: true,
                    token: token,
                    user: {
                        id: jsonPayload.sub,
                        email: jsonPayload.email,
                        name: jsonPayload.name,
                        profilePicture: jsonPayload.picture,
                        provider: 'google'
                    },
                    message: 'Google 로그인 성공'
                });
            } catch (error) {
                console.error('❌ Google 토큰 처리 오류:', error);
                return res.status(400).json({
                    error: 'Google 토큰 처리 중 오류',
                    code: 'GOOGLE_TOKEN_ERROR',
                    message: error.message
                });
            }
        }

        res.status(400).json({
            error: '지원하지 않는 액션입니다',
            code: 'UNSUPPORTED_ACTION'
        });

    } catch (error) {
        console.error('❌ Simple Basic Auth API 최상위 오류:', error);
        
        // JSON 응답 보장
        if (!res.headersSent) {
            res.status(500).json({
                error: '서버 오류가 발생했습니다',
                code: 'INTERNAL_ERROR',
                message: error.message
            });
        }
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

        console.log('✅ 사용자 테이블 초기화 완료');
    } catch (error) {
        console.error('❌ 테이블 초기화 오류:', error);
        throw error;
    }
}