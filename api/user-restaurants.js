// 사용자 저장 맛집 관리 API 엔드포인트
const database = require('../lib/database');
const authManager = require('../lib/auth');

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 데이터베이스 초기화
        await database.initializeDatabase();

        const { method, query } = req;

        // 인증이 필요한 모든 요청에 대해 사용자 확인
        const authResult = await authenticateRequest(req, res);
        if (!authResult.success) {
            return; // 이미 응답이 보내짐
        }

        const { user, isGuest } = authResult;

        switch (method) {
            case 'GET':
                return await handleGetSavedRestaurants(req, res, user, isGuest);
            
            case 'POST':
                return await handleSaveRestaurant(req, res, user, isGuest);
            
            case 'DELETE':
                return await handleUnsaveRestaurant(req, res, user, isGuest);
            
            default:
                res.status(405).json({ 
                    error: '지원하지 않는 HTTP 메소드입니다',
                    code: 'METHOD_NOT_ALLOWED' 
                });
        }

    } catch (error) {
        console.error('User Restaurants API 오류:', error);
        res.status(500).json({ 
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_ERROR',
            message: error.message 
        });
    }
}

// 요청 인증 처리
async function authenticateRequest(req, res) {
    try {
        const authHeader = req.headers.authorization;
        const token = authManager.extractTokenFromHeader(authHeader);

        if (!token) {
            res.status(401).json({
                error: '인증 토큰이 필요합니다',
                code: 'MISSING_TOKEN'
            });
            return { success: false };
        }

        const decoded = authManager.verifyToken(token);
        if (!decoded) {
            res.status(401).json({
                error: '유효하지 않은 토큰입니다',
                code: 'INVALID_TOKEN'
            });
            return { success: false };
        }

        // 게스트 사용자 처리
        if (decoded.isGuest) {
            return { 
                success: true, 
                user: null, 
                isGuest: true,
                decoded: decoded 
            };
        }

        // 일반 사용자 확인
        const user = await database.getUserById(decoded.userId);
        if (!user) {
            res.status(404).json({
                error: '사용자를 찾을 수 없습니다',
                code: 'USER_NOT_FOUND'
            });
            return { success: false };
        }

        return { 
            success: true, 
            user: user, 
            isGuest: false,
            decoded: decoded 
        };

    } catch (error) {
        console.error('인증 처리 에러:', error);
        res.status(500).json({
            error: '인증 처리 중 오류가 발생했습니다',
            code: 'AUTH_ERROR'
        });
        return { success: false };
    }
}

// 저장된 맛집 목록 조회
async function handleGetSavedRestaurants(req, res, user, isGuest) {
    try {
        if (isGuest) {
            // 게스트는 localStorage 기반으로 클라이언트에서 관리
            return res.status(200).json({
                restaurants: [],
                count: 0,
                message: '게스트 사용자는 로컬 저장소를 사용합니다',
                isGuest: true
            });
        }

        const savedRestaurants = await database.getSavedRestaurants(user.id);

        res.status(200).json({
            restaurants: savedRestaurants,
            count: savedRestaurants.length,
            isGuest: false
        });

    } catch (error) {
        console.error('저장된 맛집 조회 실패:', error);
        res.status(500).json({
            error: '저장된 맛집을 불러오는 중 오류가 발생했습니다',
            code: 'GET_SAVED_ERROR',
            message: error.message
        });
    }
}

// 맛집 저장
async function handleSaveRestaurant(req, res, user, isGuest) {
    try {
        const { restaurant } = req.body;

        if (!restaurant || !restaurant.id) {
            return res.status(400).json({
                error: '저장할 맛집 정보가 필요합니다',
                code: 'MISSING_RESTAURANT_DATA'
            });
        }

        if (isGuest) {
            // 게스트는 클라이언트에서 localStorage로 처리
            return res.status(200).json({
                success: true,
                message: '게스트 사용자는 로컬 저장소를 사용합니다',
                isGuest: true,
                restaurant: restaurant
            });
        }

        // 이미 저장된 맛집인지 확인
        const alreadySaved = await database.isRestaurantSaved(user.id, restaurant.id);
        if (alreadySaved) {
            return res.status(409).json({
                error: '이미 저장된 맛집입니다',
                code: 'ALREADY_SAVED'
            });
        }

        // 맛집 저장
        const result = await database.saveRestaurant(user.id, restaurant);

        res.status(201).json({
            success: true,
            message: `"${restaurant.name}"을(를) 저장했습니다`,
            savedAt: result?.saved_at || new Date().toISOString(),
            restaurant: restaurant
        });

    } catch (error) {
        console.error('맛집 저장 실패:', error);
        res.status(500).json({
            error: '맛집 저장 중 오류가 발생했습니다',
            code: 'SAVE_ERROR',
            message: error.message
        });
    }
}

// 맛집 저장 해제
async function handleUnsaveRestaurant(req, res, user, isGuest) {
    try {
        const { restaurantId } = req.query;

        if (!restaurantId) {
            return res.status(400).json({
                error: '삭제할 맛집 ID가 필요합니다',
                code: 'MISSING_RESTAURANT_ID'
            });
        }

        if (isGuest) {
            // 게스트는 클라이언트에서 localStorage로 처리
            return res.status(200).json({
                success: true,
                message: '게스트 사용자는 로컬 저장소를 사용합니다',
                isGuest: true,
                restaurantId: restaurantId
            });
        }

        // 저장 해제
        const removed = await database.unsaveRestaurant(user.id, restaurantId);

        if (!removed) {
            return res.status(404).json({
                error: '저장된 맛집을 찾을 수 없습니다',
                code: 'RESTAURANT_NOT_FOUND'
            });
        }

        res.status(200).json({
            success: true,
            message: '맛집을 저장 목록에서 제거했습니다',
            restaurantId: restaurantId
        });

    } catch (error) {
        console.error('맛집 저장 해제 실패:', error);
        res.status(500).json({
            error: '맛집 저장 해제 중 오류가 발생했습니다',
            code: 'UNSAVE_ERROR',
            message: error.message
        });
    }
}

// 저장 상태 확인 (GET 요청에 restaurantId 쿼리 파라미터 포함시)
async function handleCheckSaveStatus(req, res, user, isGuest) {
    try {
        const { restaurantId } = req.query;

        if (!restaurantId) {
            return res.status(400).json({
                error: '확인할 맛집 ID가 필요합니다',
                code: 'MISSING_RESTAURANT_ID'
            });
        }

        if (isGuest) {
            return res.status(200).json({
                saved: false,
                message: '게스트 사용자는 로컬 저장소를 확인하세요',
                isGuest: true
            });
        }

        const isSaved = await database.isRestaurantSaved(user.id, restaurantId);

        res.status(200).json({
            saved: isSaved,
            restaurantId: restaurantId,
            isGuest: false
        });

    } catch (error) {
        console.error('저장 상태 확인 실패:', error);
        res.status(500).json({
            error: '저장 상태 확인 중 오류가 발생했습니다',
            code: 'CHECK_STATUS_ERROR',
            message: error.message
        });
    }
}