const restaurants = require('./restaurantData');

class RestaurantService {
    // 모든 맛집 가져오기
    getAllRestaurants() {
        return restaurants;
    }

    // 지역별 맛집 검색
    getRestaurantsByArea(area) {
        return restaurants.filter(restaurant => 
            restaurant.area.toLowerCase().includes(area.toLowerCase())
        );
    }

    // 카테고리별 맛집 검색
    getRestaurantsByCategory(category) {
        return restaurants.filter(restaurant => 
            restaurant.category.toLowerCase().includes(category.toLowerCase())
        );
    }

    // 가격대별 맛집 검색
    getRestaurantsByPrice(maxPrice) {
        return restaurants.filter(restaurant => {
            const priceMatch = restaurant.priceRange.match(/(\d+,?\d*)-?(\d+,?\d*)?원?/);
            if (priceMatch) {
                const minPrice = parseInt(priceMatch[1].replace(',', ''));
                return minPrice <= maxPrice;
            }
            return false;
        });
    }

    // 키워드로 맛집 검색 (이름, 설명, 특산품에서 검색)
    searchRestaurants(keyword) {
        const searchTerm = keyword.toLowerCase();
        return restaurants.filter(restaurant => 
            restaurant.name.toLowerCase().includes(searchTerm) ||
            restaurant.description.toLowerCase().includes(searchTerm) ||
            restaurant.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm)) ||
            restaurant.area.toLowerCase().includes(searchTerm)
        );
    }

    // 복합 조건으로 맛집 검색 (모드별 필터링 포함)
    findRestaurants(criteria) {
        let results = restaurants;

        // 모드별 맛집 필터링
        if (criteria.mode) {
            results = this.filterByMode(results, criteria.mode);
        }

        if (criteria.area) {
            results = results.filter(restaurant => 
                restaurant.area.toLowerCase().includes(criteria.area.toLowerCase())
            );
        }

        if (criteria.category) {
            results = results.filter(restaurant => 
                restaurant.category.toLowerCase().includes(criteria.category.toLowerCase())
            );
        }

        if (criteria.keyword) {
            const searchTerm = criteria.keyword.toLowerCase();
            results = results.filter(restaurant => 
                restaurant.name.toLowerCase().includes(searchTerm) ||
                restaurant.description.toLowerCase().includes(searchTerm) ||
                restaurant.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm))
            );
        }

        if (criteria.maxPrice) {
            results = results.filter(restaurant => {
                const priceMatch = restaurant.priceRange.match(/(\d+,?\d*)-?(\d+,?\d*)?원?/);
                if (priceMatch) {
                    const minPrice = parseInt(priceMatch[1].replace(',', ''));
                    return minPrice <= criteria.maxPrice;
                }
                return false;
            });
        }

        // 위치 기반 필터링 및 정렬
        if (criteria.userLocation) {
            results = results.map(restaurant => ({
                ...restaurant,
                distance: this.calculateDistance(
                    criteria.userLocation.lat,
                    criteria.userLocation.lng,
                    restaurant.coordinates.lat,
                    restaurant.coordinates.lng
                )
            }));

            // 거리순으로 정렬 (가까운 순)
            results.sort((a, b) => a.distance - b.distance);

            // 3km 이내 맛집만 필터링 (선택사항)
            if (criteria.nearbyOnly) {
                results = results.filter(restaurant => restaurant.distance <= 3);
            }
        }

        return results;
    }

    // 두 GPS 좌표 간의 거리 계산 (Haversine formula)
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // 지구 반지름 (km)
        const dLat = this.toRadians(lat2 - lat1);
        const dLng = this.toRadians(lng2 - lng1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
            Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // 거리 (km)
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    // 모드별 맛집 필터링 및 우선순위 정렬
    filterByMode(restaurants, mode) {
        switch (mode) {
            case 'authentic': // 찐 맛집 - 유명하고 소문난 맛집 위주
                return this.sortByAuthenticity(restaurants);
            
            case 'budget': // 가성비 - 저렴하고 현지인 맛집 위주
                return this.sortByBudgetFriendly(restaurants);
            
            case 'date': // 데이트 맛집 - 깔끔하고 인테리어 신경 쓴 맛집
                return this.sortByDateFriendly(restaurants);
            
            default:
                return restaurants;
        }
    }

    // 찐 맛집 모드: 유명하고 전통있는 맛집 우선
    sortByAuthenticity(restaurants) {
        const authenticKeywords = ['전통', '유명', '명소', '오래된', '역사', '원조', '본점', '갈비집', '회센터'];
        const highPriceRestaurants = restaurants.filter(r => {
            const price = this.extractMinPrice(r.priceRange);
            return price >= 20000; // 2만원 이상
        });
        
        return restaurants
            .map(restaurant => ({
                ...restaurant,
                authenticScore: this.calculateAuthenticScore(restaurant, authenticKeywords)
            }))
            .sort((a, b) => b.authenticScore - a.authenticScore);
    }

    // 가성비 모드: 저렴하고 현지인들이 자주 가는 맛집 우선
    sortByBudgetFriendly(restaurants) {
        const budgetKeywords = ['가성비', '저렴', '현지', '동네', '골목', '분식', '국밥'];
        
        return restaurants
            .filter(restaurant => {
                const price = this.extractMinPrice(restaurant.priceRange);
                return price <= 20000; // 2만원 이하
            })
            .map(restaurant => ({
                ...restaurant,
                budgetScore: this.calculateBudgetScore(restaurant, budgetKeywords)
            }))
            .sort((a, b) => b.budgetScore - a.budgetScore);
    }

    // 데이트 맛집 모드: 깔끔하고 인테리어 좋은 맛집 우선
    sortByDateFriendly(restaurants) {
        const dateKeywords = ['깔끔', '인테리어', '분위기', '뷰', '전망', '센텀', '해운대', '카페', '레스토랑'];
        
        return restaurants
            .map(restaurant => ({
                ...restaurant,
                dateScore: this.calculateDateScore(restaurant, dateKeywords)
            }))
            .sort((a, b) => b.dateScore - a.dateScore);
    }

    // 가격 범위에서 최소 가격 추출
    extractMinPrice(priceRange) {
        const priceMatch = priceRange.match(/(\d+,?\d*)/);
        if (priceMatch) {
            return parseInt(priceMatch[1].replace(',', ''));
        }
        return 0;
    }

    // 찐 맛집 점수 계산
    calculateAuthenticScore(restaurant, keywords) {
        let score = 0;
        const text = (restaurant.name + ' ' + restaurant.description).toLowerCase();
        
        keywords.forEach(keyword => {
            if (text.includes(keyword)) score += 2;
        });
        
        // 높은 가격대 가산점
        const price = this.extractMinPrice(restaurant.priceRange);
        if (price >= 30000) score += 3;
        else if (price >= 20000) score += 1;
        
        // 한식, 해산물 카테고리 가산점
        if (restaurant.category === '한식' || restaurant.category === '해산물') score += 2;
        
        return score;
    }

    // 가성비 점수 계산
    calculateBudgetScore(restaurant, keywords) {
        let score = 0;
        const text = (restaurant.name + ' ' + restaurant.description).toLowerCase();
        
        keywords.forEach(keyword => {
            if (text.includes(keyword)) score += 2;
        });
        
        // 저렴한 가격대 가산점
        const price = this.extractMinPrice(restaurant.priceRange);
        if (price <= 10000) score += 3;
        else if (price <= 15000) score += 2;
        else if (price <= 20000) score += 1;
        
        // 분식, 한식 카테고리 가산점
        if (restaurant.category === '분식' || restaurant.category === '한식') score += 1;
        
        return score;
    }

    // 데이트 맛집 점수 계산
    calculateDateScore(restaurant, keywords) {
        let score = 0;
        const text = (restaurant.name + ' ' + restaurant.description + ' ' + restaurant.area).toLowerCase();
        
        keywords.forEach(keyword => {
            if (text.includes(keyword)) score += 2;
        });
        
        // 해운대, 센텀, 광안리 지역 가산점 (뷰 좋은 곳)
        if (restaurant.area.includes('해운대') || restaurant.area.includes('센텀') || restaurant.area.includes('광안리')) {
            score += 3;
        }
        
        // 적당한 가격대 가산점 (너무 싸지도 비싸지도 않은)
        const price = this.extractMinPrice(restaurant.priceRange);
        if (price >= 15000 && price <= 40000) score += 2;
        
        return score;
    }

    // 랜덤 맛집 추천
    getRandomRestaurants(count = 3) {
        const shuffled = [...restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 맛집 추천 요청인지 확인
    isRestaurantRecommendationRequest(query) {
        const lowerQuery = query.toLowerCase();
        const recommendationKeywords = [
            '추천', '맛집', '음식점', '식당', '먹을', '먹고', '드실', '어디', '뭐먹', '뭘먹',
            '밥', '점심', '저녁', '식사', '회식', '데이트', '소개', '알려줘', '찾아줘',
            '가볼만한', '유명한', '맛있는', '괜찮은', '좋은', '갈만한'
        ];
        
        return recommendationKeywords.some(keyword => lowerQuery.includes(keyword));
    }

    // 사용자 질문 분석하여 검색 조건 추출
    analyzeUserQuery(query) {
        const criteria = {};
        const lowerQuery = query.toLowerCase();

        // GPS 좌표 추출 (위도: xx, 경도: xx 형식)
        const locationMatch = query.match(/위도:\s*([\d.]+),\s*경도:\s*([\d.]+)/);
        if (locationMatch) {
            criteria.userLocation = {
                lat: parseFloat(locationMatch[1]),
                lng: parseFloat(locationMatch[2])
            };
            criteria.nearbyOnly = true; // 주변 맛집 요청시 3km 이내만
        }

        // 주변/근처 키워드 체크
        if (lowerQuery.includes('주변') || lowerQuery.includes('근처') || lowerQuery.includes('가까운')) {
            criteria.nearbyOnly = true;
        }

        // 지역 키워드 매핑
        const areaKeywords = {
            '해운대': ['해운대', '센텀'],
            '서면': ['서면', '부산진'],
            '남포동': ['남포동', '중구', '자갈치'],
            '광안리': ['광안리', '수영'],
            '기장': ['기장'],
            '동래': ['동래', '온천장'],
            '장전동': ['부산대', '장전동'],
            '태종대': ['태종대', '영도'],
            '하단': ['하단', '사하구'],
            '연산동': ['연산동'],
            '사직': ['사직', '덕천'],
            '강서구': ['강서구', '김해공항']
        };

        // 음식 카테고리 키워드 매핑
        const categoryKeywords = {
            '한식': ['한식', '국밥', '갈비', '삼계탕', '파전', '족발', '곱창', '한정식'],
            '해산물': ['해산물', '회', '횟집', '곰장어', '멸치', '전복', '조개'],
            '분식': ['분식', '떡볶이', '당면', '김밥'],
            '간식': ['간식', '호떡', '씨앗호떡'],
            '치킨': ['치킨', '후라이드', '양념']
        };

        // 특정 음식 키워드
        const foodKeywords = {
            '돼지국밥': '돼지국밥',
            '밀면': '밀면',
            '회': '회',
            '갈비': '갈비',
            '파전': '파전',
            '곰장어': '곰장어',
            '족발': '족발',
            '곱창': '곱창',
            '치킨': '치킨',
            '호떡': '호떡'
        };

        // 지역 분석
        for (const [area, keywords] of Object.entries(areaKeywords)) {
            if (keywords.some(keyword => lowerQuery.includes(keyword))) {
                criteria.area = area;
                break;
            }
        }

        // 카테고리 분석
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerQuery.includes(keyword))) {
                criteria.category = category;
                break;
            }
        }

        // 특정 음식 키워드 분석
        for (const [food, keyword] of Object.entries(foodKeywords)) {
            if (lowerQuery.includes(keyword)) {
                criteria.keyword = food;
                break;
            }
        }

        // 가격 관련 키워드 분석
        if (lowerQuery.includes('저렴') || lowerQuery.includes('싸') || lowerQuery.includes('가성비')) {
            criteria.maxPrice = 15000;
        } else if (lowerQuery.includes('비싸') || lowerQuery.includes('고급') || lowerQuery.includes('특별')) {
            criteria.maxPrice = 100000; // 높은 가격대도 포함
        }

        return criteria;
    }
}

module.exports = new RestaurantService();