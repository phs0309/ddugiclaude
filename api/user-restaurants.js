// 사용자 저장 맛집 관리 API
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = async function handler(req, res) {
    console.log('🍽️ User Restaurants API 시작:', { method: req.method });
    
    try {
        // CORS 설정
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
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

        // 데이터베이스 테이블 초기화 (필수)
        try {
            console.log('🔧 데이터베이스 테이블 초기화 시도...');
            await initializeTables();
            console.log('✅ 테이블 초기화 완료');
        } catch (dbError) {
            console.error('❌ 데이터베이스 초기화 실패:', dbError);
            return res.status(503).json({
                error: '데이터베이스 연결에 실패했습니다',
                code: 'DATABASE_CONNECTION_FAILED',
                message: '데이터베이스 서비스에 연결할 수 없습니다. 관리자에게 문의해주세요.',
                details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
            });
        }

        if (req.method === 'GET') {
            // 저장된 맛집 조회 (users 테이블에서)
            try {
                console.log('🔍 조회할 사용자 이메일:', user.email);
                
                const { data: userData, error } = await supabase
                    .from('users')
                    .select('saved_restaurant_ids')
                    .eq('email', user.email)
                    .single();

                if (error) {
                    console.error('❌ 사용자 데이터 조회 실패:', {
                        error: error,
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    });
                    
                    // 컬럼이 없는 경우 특별 처리
                    if (error.message?.includes('column') || error.code === '42703') {
                        console.log('⚠️ saved_restaurant_ids 컬럼이 없습니다. 빈 배열 반환');
                        return res.status(200).json({
                            success: true,
                            restaurantIds: [],
                            count: 0,
                            message: 'saved_restaurant_ids 컬럼이 없습니다. SQL 실행이 필요합니다.'
                        });
                    }
                    
                    throw error;
                }

                const savedIds = userData?.saved_restaurant_ids || [];
                console.log('📋 저장된 맛집 ID들:', savedIds);
                console.log('📋 ID 타입들:', savedIds.map(id => ({ id, type: typeof id, length: String(id).length })));

                return res.status(200).json({
                    success: true,
                    restaurantIds: savedIds,
                    count: savedIds.length,
                    isGuest: false,
                    message: `${savedIds.length}개의 저장된 맛집이 있습니다`,
                    debug: {
                        savedIds: savedIds,
                        idTypes: savedIds.map(id => ({ id, type: typeof id, length: String(id).length }))
                    }
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
                // 현재 저장된 맛집 ID들 가져오기
                const { data: userData, error: fetchError } = await supabase
                    .from('users')
                    .select('saved_restaurant_ids')
                    .eq('email', user.email)
                    .single();

                if (fetchError) {
                    throw fetchError;
                }

                const currentIds = userData?.saved_restaurant_ids || [];
                console.log('📝 현재 저장된 ID들:', currentIds);

                // 중복 체크
                if (currentIds.includes(restaurant.id)) {
                    return res.status(400).json({
                        error: '이미 저장된 맛집입니다',
                        code: 'ALREADY_SAVED'
                    });
                }

                // 새 ID 추가
                const updatedIds = [...currentIds, restaurant.id];
                console.log('📝 업데이트될 ID들:', updatedIds);

                // users 테이블 업데이트
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        saved_restaurant_ids: updatedIds,
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', user.email);

                if (updateError) {
                    throw updateError;
                }

                return res.status(200).json({
                    success: true,
                    message: `"${restaurant.name}"을(를) 저장했습니다`,
                    restaurantId: restaurant.id,
                    totalSaved: updatedIds.length,
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
                // 현재 저장된 맛집 ID들 가져오기
                const { data: userData, error: fetchError } = await supabase
                    .from('users')
                    .select('saved_restaurant_ids')
                    .eq('email', user.email)
                    .single();

                if (fetchError) {
                    throw fetchError;
                }

                const currentIds = userData?.saved_restaurant_ids || [];
                console.log('🗑️ 현재 저장된 ID들:', currentIds);

                // 삭제할 ID가 있는지 확인
                if (!currentIds.includes(restaurantId)) {
                    return res.status(404).json({
                        error: '저장된 맛집을 찾을 수 없습니다',
                        code: 'NOT_FOUND'
                    });
                }

                // ID 제거
                const updatedIds = currentIds.filter(id => id !== restaurantId);
                console.log('🗑️ 업데이트될 ID들:', updatedIds);

                // users 테이블 업데이트
                const { error: updateError } = await supabase
                    .from('users')
                    .update({
                        saved_restaurant_ids: updatedIds,
                        updated_at: new Date().toISOString()
                    })
                    .eq('email', user.email);

                if (updateError) {
                    throw updateError;
                }

                return res.status(200).json({
                    success: true,
                    message: '맛집을 저장 목록에서 제거했습니다',
                    restaurantId: restaurantId,
                    totalSaved: updatedIds.length,
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
        
        // 데이터베이스 연결 오류 처리
        if (error.message && (error.message.includes('connect') || error.message.includes('NeonDbError'))) {
            return res.status(503).json({
                error: '데이터베이스 연결 실패',
                code: 'DATABASE_CONNECTION_FAILED',
                message: '데이터베이스 서비스에 연결할 수 없습니다. 환경설정을 확인해주세요.'
            });
        }

        return res.status(500).json({
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// 데이터베이스 테이블 초기화 (Supabase)
async function initializeTables() {
    try {
        // 환경변수 확인 및 로깅
        console.log('🔍 Supabase 환경변수 확인:', {
            SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        });
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase 환경변수가 설정되지 않았습니다');
        }

        console.log('📊 Supabase 테이블 생성 시작...');
        
        // 사용자 테이블 생성 (존재하지 않으면)
        const { error: usersError } = await supabase.rpc('create_users_table_if_not_exists');
        if (usersError && !usersError.message.includes('already exists')) {
            // 직접 SQL 실행 방식으로 폴백
            const { error: directUsersError } = await supabase
                .from('users')
                .select('id')
                .limit(1);
            
            if (directUsersError && directUsersError.code === 'PGRST116') {
                console.log('✅ users 테이블이 필요하지만 자동 생성은 제한됨');
            }
        }
        console.log('✅ users 테이블 확인 완료');

        // 사용자 맛집 테이블 확인
        const { error: restaurantsError } = await supabase
            .from('user_restaurants')
            .select('id')
            .limit(1);
            
        if (restaurantsError && restaurantsError.code === 'PGRST116') {
            console.log('⚠️ user_restaurants 테이블이 존재하지 않습니다');
            throw new Error('필요한 테이블이 존재하지 않습니다. Supabase 대시보드에서 테이블을 생성해주세요.');
        }
        console.log('✅ user_restaurants 테이블 확인 완료');

    } catch (error) {
        console.error('❌ Supabase 테이블 초기화 실패:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        throw new Error(`Supabase 초기화 실패: ${error.message}`);
    }
}