// 현재 위치 기반 주변 맛집 추천 API
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({
            error: '지원하지 않는 메소드입니다',
            code: 'METHOD_NOT_ALLOWED'
        });
    }

    try {
        const { lat, lng, radius = 2 } = req.query;

        // 위도, 경도 유효성 검사
        if (!lat || !lng) {
            return res.status(400).json({
                error: '위도(lat)와 경도(lng) 파라미터가 필요합니다',
                code: 'MISSING_COORDINATES'
            });
        }

        const userLat = parseFloat(lat);
        const userLng = parseFloat(lng);
        const searchRadius = parseFloat(radius); // km 단위

        // 부산 지역 범위 확인 (대략적)
        if (userLat < 35.0 || userLat > 35.4 || userLng < 128.8 || userLng > 129.3) {
            return res.status(200).json({
                success: true,
                message: '현재 위치가 부산 지역을 벗어났습니다. 전체 맛집을 추천해드릴게요!',
                restaurants: [],
                isOutsideBusan: true,
                userLocation: { lat: userLat, lng: userLng }
            });
        }

        // restaurants.json 파일 읽기
        const filePath = path.join(process.cwd(), 'restaurants.json');
        const restaurantsData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // 거리 계산 및 필터링
        const nearbyRestaurants = restaurantsData
            .map(restaurant => {
                if (!restaurant.coordinates) {
                    return null;
                }

                const distance = calculateDistance(
                    userLat, userLng,
                    restaurant.coordinates.lat, restaurant.coordinates.lng
                );

                return {
                    ...restaurant,
                    distance: Math.round(distance * 100) / 100 // 소수점 2자리
                };
            })
            .filter(restaurant => restaurant && restaurant.distance <= searchRadius)
            .sort((a, b) => a.distance - b.distance); // 거리순 정렬

        return res.status(200).json({
            success: true,
            restaurants: nearbyRestaurants,
            count: nearbyRestaurants.length,
            searchRadius: searchRadius,
            userLocation: { lat: userLat, lng: userLng },
            message: nearbyRestaurants.length > 0 
                ? `주변 ${searchRadius}km 내 맛집 ${nearbyRestaurants.length}곳을 찾았습니다!`
                : `주변 ${searchRadius}km 내에 등록된 맛집이 없습니다. 검색 반경을 늘려보세요.`
        });

    } catch (error) {
        console.error('주변 맛집 API 오류:', error);
        return res.status(500).json({
            error: '서버 오류가 발생했습니다',
            code: 'INTERNAL_SERVER_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// 두 점 사이의 거리를 계산하는 함수 (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // 지구 반지름 (km)
    const dLat = deg2rad(lat2 - lat1);
    const dLng = deg2rad(lng2 - lng1);
    
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
        Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // 거리 (km)
    
    return distance;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}