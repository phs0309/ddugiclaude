import restaurants from './restaurantData.js';

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

    // 복합 조건으로 맛집 검색
    findRestaurants(criteria) {
        let results = restaurants;

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

        return results;
    }

    // 랜덤 맛집 추천
    getRandomRestaurants(count = 3) {
        const shuffled = [...restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 사용자 질문 분석하여 검색 조건 추출
    analyzeUserQuery(query) {
        const criteria = {};
        const lowerQuery = query.toLowerCase();

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

export default new RestaurantService();