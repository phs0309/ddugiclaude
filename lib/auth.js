// JWT 인증 및 사용자 관리 유틸리티
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthManager {
    constructor() {
        // JWT 시크릿 키 (환경변수에서 가져오거나 랜덤 생성)
        this.jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        this.jwtExpiry = '7d'; // 7일
    }

    // JWT 토큰 생성
    generateToken(user) {
        try {
            const payload = {
                userId: user.id,
                email: user.email,
                name: user.name,
                provider: user.provider
            };

            return jwt.sign(payload, this.jwtSecret, { 
                expiresIn: this.jwtExpiry,
                issuer: 'ddugi-busan-restaurant-app'
            });
        } catch (error) {
            console.error('JWT 토큰 생성 실패:', error);
            throw new Error('토큰 생성에 실패했습니다');
        }
    }

    // JWT 토큰 검증
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            console.error('JWT 토큰 검증 실패:', error);
            return null;
        }
    }

    // Google ID 토큰 디코딩 (클라이언트에서 받은 것)
    decodeGoogleToken(idToken) {
        try {
            // Google ID 토큰의 payload 부분만 디코딩 (검증은 클라이언트에서 이미 완료)
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

    // Authorization 헤더에서 토큰 추출
    extractTokenFromHeader(authHeader) {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return null;
        }
        return authHeader.substring(7);
    }

    // 미들웨어: 인증된 사용자 확인
    authenticateUser(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            const token = this.extractTokenFromHeader(authHeader);

            if (!token) {
                return res.status(401).json({
                    error: '인증 토큰이 필요합니다',
                    code: 'MISSING_TOKEN'
                });
            }

            const decoded = this.verifyToken(token);
            if (!decoded) {
                return res.status(401).json({
                    error: '유효하지 않은 토큰입니다',
                    code: 'INVALID_TOKEN'
                });
            }

            // 요청 객체에 사용자 정보 추가
            req.user = decoded;
            next();
        } catch (error) {
            console.error('인증 미들웨어 에러:', error);
            res.status(500).json({
                error: '인증 처리 중 오류가 발생했습니다',
                code: 'AUTH_ERROR'
            });
        }
    }

    // 선택적 인증 미들웨어 (토큰이 있으면 검증, 없어도 통과)
    optionalAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            const token = this.extractTokenFromHeader(authHeader);

            if (token) {
                const decoded = this.verifyToken(token);
                if (decoded) {
                    req.user = decoded;
                }
            }

            next();
        } catch (error) {
            console.error('선택적 인증 에러:', error);
            next(); // 에러가 발생해도 계속 진행
        }
    }

    // 사용자 정보 정규화 (다양한 OAuth 제공자 대응)
    normalizeUserData(userData, provider = 'email') {
        const normalized = {
            email: userData.email,
            name: userData.name,
            profilePicture: userData.picture || userData.profile_picture || null,
            provider: provider,
            providerId: userData.sub || userData.id || null
        };

        // 이메일 유효성 검사
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalized.email)) {
            throw new Error('유효하지 않은 이메일 주소입니다');
        }

        return normalized;
    }

    // 게스트 사용자 토큰 생성
    generateGuestToken() {
        const guestPayload = {
            userId: null,
            email: 'guest@ddugi.app',
            name: '게스트 사용자',
            provider: 'guest',
            isGuest: true
        };

        return jwt.sign(guestPayload, this.jwtSecret, { 
            expiresIn: '1d', // 게스트는 1일
            issuer: 'ddugi-busan-restaurant-app'
        });
    }
}

module.exports = new AuthManager();