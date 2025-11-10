// 간단한 인증 API (Vercel 호환)
import { sql } from '@vercel/postgres';

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

        if (action === 'test-db') {
            // 데이터베이스 연결 테스트
            await sql`SELECT 1 as test`;
            
            return res.status(200).json({
                success: true,
                message: 'PostgreSQL 데이터베이스 연결 성공'
            });
        }

        res.status(400).json({
            error: '지원하지 않는 액션입니다',
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