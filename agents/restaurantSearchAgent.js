// 맛집 검색 전문 에이전트
class RestaurantSearchAgent {
    constructor() {
        this.name = "맛집 검색 에이전트";
        this.description = "사용자 요구사항에 맞는 맛집을 검색하고 필터링";
    }

    /**
     * 맛집 검색 실행
     * @param {Object} query - 검색 조건
     * @returns {Promise<Array>} 검색된 맛집 목록
     */
    async search(query) {
        const { keyword, area, category, priceRange, minRating } = query;
        
        console.log(`🔍 검색 시작: ${keyword || '전체'}`);
        
        // restaurants_해운대구.json 파일 읽기
        const fs = require('fs').promises;
        const path = require('path');
        
        try {
            const dataPath = path.join(__dirname, '../restaurants/restaurants_해운대구.json');
            const data = await fs.readFile(dataPath, 'utf8');
            let restaurants = JSON.parse(data);
            
            // 필터링 로직
            if (keyword) {
                restaurants = restaurants.filter(r => 
                    r.name.toLowerCase().includes(keyword.toLowerCase()) ||
                    r.specialty?.toLowerCase().includes(keyword.toLowerCase()) ||
                    r.features?.some(f => f.toLowerCase().includes(keyword.toLowerCase()))
                );
            }
            
            if (area) {
                restaurants = restaurants.filter(r => r.area === area);
            }
            
            if (category) {
                restaurants = restaurants.filter(r => r.category === category);
            }
            
            if (priceRange) {
                restaurants = restaurants.filter(r => this.matchPriceRange(r.priceRange, priceRange));
            }
            
            if (minRating) {
                restaurants = restaurants.filter(r => r.rating >= minRating);
            }
            
            // 평점 순으로 정렬
            restaurants.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            
            console.log(`✅ ${restaurants.length}개 맛집 검색 완료`);
            
            return restaurants;
            
        } catch (error) {
            console.error('검색 중 오류:', error);
            return [];
        }
    }
    
    /**
     * 가격대 매칭
     */
    matchPriceRange(restaurantPrice, targetPrice) {
        if (!restaurantPrice) return true;
        
        const priceMap = {
            '저렴': [0, 15000],
            '보통': [15000, 30000],
            '비싼': [30000, 100000]
        };
        
        const range = priceMap[targetPrice];
        if (!range) return true;
        
        // 가격 문자열에서 숫자 추출
        const numbers = restaurantPrice.match(/\d+/g);
        if (!numbers) return true;
        
        const minPrice = parseInt(numbers[0]);
        return minPrice >= range[0] && minPrice <= range[1];
    }
    
    /**
     * 거리 기반 검색
     */
    async searchByDistance(userLocation, maxDistance = 1000) {
        const restaurants = await this.search({});
        
        // 거리 계산 (간단한 유클리드 거리)
        const nearbyRestaurants = restaurants.filter(r => {
            if (!r.coordinates) return false;
            
            const distance = this.calculateDistance(
                userLocation.lat, 
                userLocation.lng,
                r.coordinates.lat,
                r.coordinates.lng
            );
            
            return distance <= maxDistance;
        });
        
        return nearbyRestaurants;
    }
    
    /**
     * 두 지점 간 거리 계산 (미터)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // 지구 반경 (미터)
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    /**
     * 인기 맛집 추천
     */
    async getPopularRestaurants(limit = 10) {
        const restaurants = await this.search({});
        
        // 평점 4.5 이상만 필터링
        const popular = restaurants
            .filter(r => r.rating >= 4.5)
            .slice(0, limit);
            
        return popular;
    }
    
    /**
     * 카테고리별 베스트
     */
    async getBestByCategory() {
        const restaurants = await this.search({});
        const categories = {};
        
        restaurants.forEach(r => {
            if (!categories[r.category]) {
                categories[r.category] = [];
            }
            categories[r.category].push(r);
        });
        
        const best = {};
        Object.keys(categories).forEach(cat => {
            best[cat] = categories[cat]
                .sort((a, b) => (b.rating || 0) - (a.rating || 0))
                .slice(0, 3);
        });
        
        return best;
    }
}

module.exports = RestaurantSearchAgent;