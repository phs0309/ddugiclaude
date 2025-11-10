// 사용자 저장 맛집 관리 API (임시 - 로컬스토리지 백엔드 에뮬레이션)

export default async function handler(req, res) {
    console.log('🍽️ User Restaurants API (Simple) 시작:', { method: req.method });
    
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

        if (req.method === 'GET') {
            // 저장된 맛집 조회 (임시로 빈 배열 반환)
            console.log('📋 저장된 맛집 조회 요청 (데이터베이스 미연결 상태)');
            
            return res.status(200).json({
                success: true,
                restaurants: [], // 임시로 빈 배열
                count: 0,
                isGuest: false,
                message: '데이터베이스 연결 문제로 저장된 맛집을 불러올 수 없습니다. 로컬스토리지를 사용해주세요.',
                fallback: true,
                note: 'Google 로그인은 성공했지만 데이터베이스가 연결되지 않아 저장 기능을 사용할 수 없습니다'
            });

        } else if (req.method === 'POST') {
            // 맛집 저장 (임시로 성공 응답만)
            const { restaurant } = req.body;

            if (!restaurant || !restaurant.id) {
                return res.status(400).json({
                    error: '저장할 맛집 정보가 필요합니다',
                    code: 'MISSING_RESTAURANT_DATA'
                });
            }

            console.log('💾 맛집 저장 시도 (데이터베이스 미연결 상태):', restaurant.name);

            // 임시로 성공 응답
            return res.status(200).json({
                success: true,
                message: `"${restaurant.name}"을(를) 저장했습니다 (임시 - 실제로는 저장되지 않음)`,
                restaurant: {
                    ...restaurant,
                    savedAt: new Date().toISOString()
                },
                isGuest: false,
                note: '데이터베이스 연결 문제로 실제로는 저장되지 않습니다. 곧 수정예정입니다.'
            });

        } else if (req.method === 'DELETE') {
            // 맛집 저장 해제 (임시로 성공 응답만)
            const { restaurantId } = req.query;

            if (!restaurantId) {
                return res.status(400).json({
                    error: '삭제할 맛집 ID가 필요합니다',
                    code: 'MISSING_RESTAURANT_ID'
                });
            }

            console.log('🗑️ 맛집 삭제 시도 (데이터베이스 미연결 상태):', restaurantId);

            return res.status(200).json({
                success: true,
                message: '맛집을 저장 목록에서 제거했습니다 (임시)',
                restaurantId: restaurantId,
                isGuest: false,
                note: '데이터베이스 연결 문제로 실제로는 삭제되지 않습니다.'
            });

        } else {
            return res.status(405).json({
                error: '지원하지 않는 메소드입니다',
                code: 'METHOD_NOT_ALLOWED'
            });
        }

    } catch (error) {
        console.error('❌ User Restaurants API 오류:', error);
        
        return res.status(500).json({
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}