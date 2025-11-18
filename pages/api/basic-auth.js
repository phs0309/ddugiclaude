// 기본 인증 API (Supabase 연동)
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
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

                // Supabase에 사용자 정보 저장/업데이트
                let dbSaveSuccess = false;
                let dbError = null;
                
                try {
                    console.log('🔍 Supabase 연결 시도...');
                    
                    // 사용자 확인
                    const { data: existingUser, error: findError } = await supabase
                        .from('users')
                        .select('id, email')
                        .eq('email', jsonPayload.email)
                        .single();

                    if (findError && findError.code !== 'PGRST116') {
                        console.log('⚠️ 사용자 조회 오류:', findError);
                        dbError = findError;
                    }

                    if (!existingUser) {
                        // 새 사용자 생성
                        const { error: insertError } = await supabase
                            .from('users')
                            .insert([{
                                email: jsonPayload.email,
                                name: jsonPayload.name,
                                profile_picture: jsonPayload.picture,
                                provider: 'google'
                            }]);

                        if (insertError) {
                            console.log('❌ 사용자 생성 실패:', insertError);
                            dbError = insertError;
                        } else {
                            console.log('✅ 새 사용자 생성:', jsonPayload.email);
                            dbSaveSuccess = true;
                        }
                    } else {
                        // 기존 사용자 정보 업데이트
                        const { error: updateError } = await supabase
                            .from('users')
                            .update({
                                name: jsonPayload.name,
                                profile_picture: jsonPayload.picture,
                                updated_at: new Date().toISOString()
                            })
                            .eq('email', jsonPayload.email);

                        if (updateError) {
                            console.log('❌ 사용자 업데이트 실패:', updateError);
                            dbError = updateError;
                        } else {
                            console.log('✅ 기존 사용자 정보 업데이트:', jsonPayload.email);
                            dbSaveSuccess = true;
                        }
                    }
                } catch (catchError) {
                    console.error('❌ Supabase 저장 실패:', catchError);
                    dbError = catchError;
                }

                // 데이터베이스 저장 실패시 로그인 실패 처리
                if (!dbSaveSuccess || dbError) {
                    console.error('❌ 데이터베이스 저장 실패로 로그인 거부');
                    return res.status(500).json({
                        error: '데이터베이스 연결 실패',
                        code: 'DATABASE_SAVE_FAILED',
                        message: '사용자 정보를 저장할 수 없어 로그인이 실패했습니다. 잠시 후 다시 시도해주세요.',
                        details: process.env.NODE_ENV === 'development' ? dbError?.message : undefined
                    });
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
                    message: 'Google 로그인 및 데이터베이스 저장 성공'
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

// Supabase에서는 테이블 초기화가 별도로 필요 없음