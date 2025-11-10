// 사용자 인증 API 엔드포인트
const database = require('../lib/database');
const authManager = require('../lib/auth');

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
        await database.initializeDatabase();

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
        const googleUser = authManager.decodeGoogleToken(idToken);
        
        // 사용자 데이터 정규화
        const normalizedUser = authManager.normalizeUserData(googleUser, 'google');

        // 사용자 생성 또는 업데이트
        const user = await database.upsertUser(normalizedUser);

        // JWT 토큰 생성
        const token = authManager.generateToken(user);

        // 로그인 활동 기록
        await database.logUserActivity(user.id, 'login', {
            provider: 'google',
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
        });

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
        const token = authManager.generateGuestToken();

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