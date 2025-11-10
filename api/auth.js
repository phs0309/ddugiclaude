// 사용자 인증 API 엔드포인트
import { sql } from '@vercel/postgres';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 데이터베이스 초기화 (첫 요청시에만 실행됨)
        await initializeDatabase();

        const { method, query } = req;
        const action = query.action;

        switch (method) {
            case 'POST':
                if (action === 'google-login') {
                    return await handleGoogleLogin(req, res);
                } else if (action === 'guest-login') {
                    return await handleGuestLogin(req, res);
                } else if (action === 'verify-token') {
                    return await handleVerifyToken(req, res);
                } else if (action === 'logout') {
                    return await handleLogout(req, res);
                }
                break;

            case 'GET':
                if (action === 'profile') {
                    return await handleGetProfile(req, res);
                }
                break;
        }

        res.status(404).json({ 
            error: '지원하지 않는 요청입니다',
            code: 'UNSUPPORTED_ACTION' 
        });

    } catch (error) {
        console.error('Auth API 오류:', error);
        res.status(500).json({ 
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_ERROR',
            message: error.message 
        });
    }
}

// Google OAuth 로그인 처리
async function handleGoogleLogin(req, res) {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                error: 'Google ID 토큰이 필요합니다',
                code: 'MISSING_ID_TOKEN'
            });
        }

        // Google ID 토큰 디코딩
        const googleUser = decodeGoogleToken(idToken);
        
        // 사용자 데이터 정규화
        const normalizedUser = {
            email: googleUser.email,
            name: googleUser.name,
            profilePicture: googleUser.picture,
            provider: 'google',
            providerId: googleUser.sub
        };

        // 사용자 생성 또는 업데이트
        const user = await upsertUser(normalizedUser);

        // JWT 토큰 생성
        const token = generateToken(user);

        // 로그인 활동 기록 (간소화)
        console.log(`✅ Google 로그인: ${user.email}`);

        res.status(200).json({
            success: true,
            token: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                profilePicture: user.profile_picture,
                provider: user.provider
            },
            message: '로그인이 완료되었습니다'
        });

    } catch (error) {
        console.error('Google 로그인 실패:', error);
        res.status(400).json({
            error: 'Google 로그인 처리 중 오류가 발생했습니다',
            code: 'GOOGLE_LOGIN_ERROR',
            message: error.message
        });
    }
}

// 게스트 로그인 처리
async function handleGuestLogin(req, res) {
    try {
        // 게스트 토큰 생성
        const token = generateGuestToken();

        res.status(200).json({
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

    } catch (error) {
        console.error('게스트 로그인 실패:', error);
        res.status(500).json({
            error: '게스트 로그인 처리 중 오류가 발생했습니다',
            code: 'GUEST_LOGIN_ERROR',
            message: error.message
        });
    }
}

// 토큰 검증
async function handleVerifyToken(req, res) {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                error: '토큰이 필요합니다',
                code: 'MISSING_TOKEN'
            });
        }

        const decoded = authManager.verifyToken(token);
        if (!decoded) {
            return res.status(401).json({
                error: '유효하지 않은 토큰입니다',
                code: 'INVALID_TOKEN'
            });
        }

        // 게스트가 아닌 경우 데이터베이스에서 사용자 정보 확인
        let user = null;
        if (!decoded.isGuest && decoded.userId) {
            user = await database.getUserById(decoded.userId);
            if (!user) {
                return res.status(401).json({
                    error: '사용자를 찾을 수 없습니다',
                    code: 'USER_NOT_FOUND'
                });
            }
        }

        res.status(200).json({
            valid: true,
            user: user || {
                id: decoded.userId,
                email: decoded.email,
                name: decoded.name,
                provider: decoded.provider,
                isGuest: decoded.isGuest
            }
        });

    } catch (error) {
        console.error('토큰 검증 실패:', error);
        res.status(500).json({
            error: '토큰 검증 중 오류가 발생했습니다',
            code: 'TOKEN_VERIFY_ERROR',
            message: error.message
        });
    }
}

// 사용자 프로필 조회
async function handleGetProfile(req, res) {
    try {
        // 인증 확인
        authManager.authenticateUser(req, res, async () => {
            const user = await database.getUserById(req.user.userId);
            
            if (!user) {
                return res.status(404).json({
                    error: '사용자를 찾을 수 없습니다',
                    code: 'USER_NOT_FOUND'
                });
            }

            // 사용자 통계 정보 가져오기
            const stats = await database.getUserStats(user.id);

            res.status(200).json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    profilePicture: user.profile_picture,
                    provider: user.provider,
                    createdAt: user.created_at,
                    stats: stats
                }
            });
        });

    } catch (error) {
        console.error('프로필 조회 실패:', error);
        res.status(500).json({
            error: '프로필 조회 중 오류가 발생했습니다',
            code: 'PROFILE_ERROR',
            message: error.message
        });
    }
}

// 로그아웃 (클라이언트에서 토큰 삭제)
async function handleLogout(req, res) {
    try {
        // 로그아웃 활동 기록 (선택사항)
        if (req.user && !req.user.isGuest) {
            await database.logUserActivity(req.user.userId, 'logout', {
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
            });
        }

        res.status(200).json({
            success: true,
            message: '로그아웃이 완료되었습니다'
        });

    } catch (error) {
        console.error('로그아웃 처리 실패:', error);
        res.status(500).json({
            error: '로그아웃 처리 중 오류가 발생했습니다',
            code: 'LOGOUT_ERROR',
            message: error.message
        });
    }
}

// 데이터베이스 초기화
async function initializeDatabase() {
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

        // 인덱스 생성
        await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_saved_restaurants_user_id ON saved_restaurants(user_id)`;

        console.log('✅ 데이터베이스 초기화 완료');
    } catch (error) {
        console.error('❌ 데이터베이스 초기화 실패:', error);
        throw error;
    }
}

// JWT 토큰 생성
function generateToken(user) {
    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    const payload = {
        userId: user.id,
        email: user.email,
        name: user.name,
        provider: user.provider
    };

    return jwt.sign(payload, jwtSecret, { 
        expiresIn: '7d',
        issuer: 'ddugi-busan-restaurant-app'
    });
}

// Google ID 토큰 디코딩
function decodeGoogleToken(idToken) {
    try {
        const base64Url = idToken.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString('utf8')
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Google ID 토큰 디코딩 실패:', error);
        throw new Error('유효하지 않은 Google 토큰입니다');
    }
}

// 사용자 생성 또는 업데이트
async function upsertUser(userData) {
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

// 게스트 토큰 생성
function generateGuestToken() {
    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    const guestPayload = {
        userId: null,
        email: 'guest@ddugi.app',
        name: '게스트 사용자',
        provider: 'guest',
        isGuest: true
    };

    return jwt.sign(guestPayload, jwtSecret, { 
        expiresIn: '1d',
        issuer: 'ddugi-busan-restaurant-app'
    });
}