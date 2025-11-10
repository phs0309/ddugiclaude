// 기본 인증 API (데이터베이스 없음)
export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { action } = req.query;

    try {
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
            // Google 로그인 (간단 버전)
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({
                    error: 'Google ID 토큰이 필요합니다',
                    code: 'MISSING_ID_TOKEN'
                });
            }

            try {
                // Google ID 토큰 디코딩 (간단한 방법)
                const base64Url = idToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = JSON.parse(Buffer.from(base64, 'base64').toString());

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
        console.error('Basic Auth API 오류:', error);
        res.status(500).json({
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_ERROR',
            message: error.message
        });
    }
}