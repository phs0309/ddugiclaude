// 맛집 추천 전문 에이전트
class RecommendationAgent {
    constructor() {
        this.name = "맛집 추천 에이전트";
        this.description = "상황별, 개인별 맞춤 맛집 추천";
        this.searchAgent = null;
        this.preferenceAgent = null;
    }
    
    /**
     * 에이전트 초기화
     */
    init(searchAgent, preferenceAgent) {
        this.searchAgent = searchAgent;
        this.preferenceAgent = preferenceAgent;
    }
    
    /**
     * 상황별 추천
     */
    async recommendBySituation(situation, userId = 'guest') {
        const recommendations = {
            '데이트': await this.getDateRestaurants(),
            '가족모임': await this.getFamilyRestaurants(),
            '회식': await this.getBusinessRestaurants(),
            '혼밥': await this.getSoloRestaurants(),
            '친구모임': await this.getFriendRestaurants(),
            '특별한날': await this.getSpecialRestaurants(),
            '브런치': await this.getBrunchRestaurants(),
            '야식': await this.getLateNightRestaurants()
        };
        
        const result = recommendations[situation] || await this.getGeneralRecommendations();
        
        // 사용자 선호도 반영
        if (this.preferenceAgent && userId !== 'guest') {
            return await this.preferenceAgent.getPersonalizedRecommendations(userId, result, 5);
        }
        
        return result.slice(0, 5);
    }
    
    /**
     * 데이트 맛집
     */
    async getDateRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        // 데이트 적합 점수 계산
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 분위기 좋은 카테고리
            if (['양식', '일식', '카페'].includes(r.category)) score += 30;
            
            // 분위기 좋은 지역
            if (['달맞이길', '송정', '마린시티'].includes(r.area)) score += 20;
            
            // 특별 피처
            if (r.features) {
                if (r.features.some(f => f.includes('뷰') || f.includes('야경'))) score += 25;
                if (r.features.some(f => f.includes('조용'))) score += 15;
                if (r.features.some(f => f.includes('분위기'))) score += 20;
            }
            
            // 평점
            score += (r.rating || 0) * 10;
            
            return { ...r, dateScore: score };
        });
        
        scored.sort((a, b) => b.dateScore - a.dateScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 가족 모임 맛집
     */
    async getFamilyRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 가족 적합 카테고리
            if (['한식', '해산물', '뷔페'].includes(r.category)) score += 30;
            
            // 넓은 공간, 주차
            if (r.features) {
                if (r.features.some(f => f.includes('주차'))) score += 25;
                if (r.features.some(f => f.includes('룸') || f.includes('단체'))) score += 20;
                if (r.features.some(f => f.includes('전통'))) score += 15;
            }
            
            // 적절한 가격대
            const price = parseInt(r.priceRange?.match(/\d+/)?.[0] || 20000);
            if (price >= 15000 && price <= 30000) score += 20;
            
            score += (r.rating || 0) * 10;
            
            return { ...r, familyScore: score };
        });
        
        scored.sort((a, b) => b.familyScore - a.familyScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 회식 맛집
     */
    async getBusinessRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 회식 적합 카테고리
            if (['한식', '해산물', '고기'].includes(r.category)) score += 30;
            
            // 회식 관련 피처
            if (r.features) {
                if (r.features.some(f => f.includes('단체') || f.includes('룸'))) score += 30;
                if (r.features.some(f => f.includes('주차'))) score += 20;
                if (r.features.some(f => f.includes('24시간'))) score += 15;
            }
            
            // 센텀시티 등 비즈니스 지역
            if (['센텀시티', '해운대'].includes(r.area)) score += 15;
            
            score += (r.rating || 0) * 10;
            
            return { ...r, businessScore: score };
        });
        
        scored.sort((a, b) => b.businessScore - a.businessScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 혼밥 맛집
     */
    async getSoloRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 혼밥 적합 카테고리
            if (['한식', '일식', '분식'].includes(r.category)) score += 25;
            
            // 혼밥 관련 피처
            if (r.features) {
                if (r.features.some(f => f.includes('바') || f.includes('카운터'))) score += 30;
                if (r.features.some(f => f.includes('1인'))) score += 35;
                if (r.features.some(f => f.includes('빠른'))) score += 15;
            }
            
            // 저렴한 가격대 선호
            const price = parseInt(r.priceRange?.match(/\d+/)?.[0] || 20000);
            if (price < 15000) score += 20;
            
            score += (r.rating || 0) * 10;
            
            return { ...r, soloScore: score };
        });
        
        scored.sort((a, b) => b.soloScore - a.soloScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 친구 모임 맛집
     */
    async getFriendRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 친구 모임 적합 카테고리
            if (['치킨', '고기', '해산물', '양식'].includes(r.category)) score += 25;
            
            // 활기찬 분위기
            if (r.features) {
                if (r.features.some(f => f.includes('인기'))) score += 20;
                if (r.features.some(f => f.includes('SNS') || f.includes('핫플'))) score += 25;
            }
            
            // 젊은 지역
            if (['센텀시티', '해운대', '송정'].includes(r.area)) score += 15;
            
            score += (r.rating || 0) * 10;
            
            return { ...r, friendScore: score };
        });
        
        scored.sort((a, b) => b.friendScore - a.friendScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 특별한 날 맛집
     */
    async getSpecialRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 고급 카테고리
            if (['일식', '양식', '해산물'].includes(r.category)) score += 25;
            
            // 고급 피처
            if (r.features) {
                if (r.features.some(f => f.includes('오마카세') || f.includes('코스'))) score += 35;
                if (r.features.some(f => f.includes('예약'))) score += 20;
                if (r.features.some(f => f.includes('뷰'))) score += 20;
            }
            
            // 높은 평점
            if (r.rating >= 4.5) score += 25;
            
            // 비싼 가격대 (고급)
            const price = parseInt(r.priceRange?.match(/\d+/)?.[0] || 20000);
            if (price > 30000) score += 15;
            
            return { ...r, specialScore: score };
        });
        
        scored.sort((a, b) => b.specialScore - a.specialScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 브런치 맛집
     */
    async getBrunchRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({
            category: '카페'
        });
        
        const others = await this.searchAgent.search({
            category: '양식'
        });
        
        const brunchPlaces = [...restaurants, ...others];
        
        const scored = brunchPlaces.map(r => {
            let score = 0;
            
            // 브런치 관련 피처
            if (r.features) {
                if (r.features.some(f => f.includes('브런치'))) score += 40;
                if (r.features.some(f => f.includes('아침'))) score += 25;
                if (r.features.some(f => f.includes('뷰'))) score += 15;
            }
            
            // 영업시간 (아침 영업)
            if (r.businessHours && r.businessHours.includes('08:') || r.businessHours.includes('09:')) {
                score += 20;
            }
            
            score += (r.rating || 0) * 10;
            
            return { ...r, brunchScore: score };
        });
        
        scored.sort((a, b) => b.brunchScore - a.brunchScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 야식 맛집
     */
    async getLateNightRestaurants() {
        if (!this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        
        const scored = restaurants.map(r => {
            let score = 0;
            
            // 야식 카테고리
            if (['치킨', '한식', '분식'].includes(r.category)) score += 25;
            
            // 24시간 또는 늦게까지
            if (r.features) {
                if (r.features.some(f => f.includes('24시간'))) score += 40;
            }
            
            if (r.businessHours) {
                if (r.businessHours.includes('24시간')) score += 40;
                if (r.businessHours.includes('23:') || r.businessHours.includes('00:')) score += 20;
            }
            
            // 돼지국밥 등 야식 메뉴
            if (r.specialty && r.specialty.includes('국밥')) score += 15;
            
            score += (r.rating || 0) * 10;
            
            return { ...r, lateNightScore: score };
        });
        
        scored.sort((a, b) => b.lateNightScore - a.lateNightScore);
        return scored.slice(0, 10);
    }
    
    /**
     * 일반 추천
     */
    async getGeneralRecommendations() {
        if (!this.searchAgent) return [];
        
        // 평점 높은 인기 맛집
        return await this.searchAgent.getPopularRestaurants(10);
    }
    
    /**
     * 날씨 기반 추천
     */
    async recommendByWeather(weather) {
        if (!this.searchAgent) return [];
        
        const weatherMenu = {
            '비': ['국밥', '탕', '전', '파전', '막걸리'],
            '더위': ['냉면', '빙수', '카페', '회'],
            '추위': ['국밥', '탕', '찌개', '국수'],
            '맑음': ['카페', '브런치', '양식']
        };
        
        const keywords = weatherMenu[weather] || [];
        const results = [];
        
        for (const keyword of keywords) {
            const restaurants = await this.searchAgent.search({ keyword });
            results.push(...restaurants);
        }
        
        // 중복 제거
        const unique = Array.from(new Map(results.map(r => [r.id, r])).values());
        
        return unique.slice(0, 10);
    }
    
    /**
     * 시간대별 추천
     */
    async recommendByTime() {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 11) {
            return await this.getBrunchRestaurants();
        } else if (hour >= 11 && hour < 14) {
            return await this.getGeneralRecommendations();
        } else if (hour >= 14 && hour < 17) {
            const cafes = await this.searchAgent.search({ category: '카페' });
            return cafes.slice(0, 10);
        } else if (hour >= 17 && hour < 22) {
            return await this.getGeneralRecommendations();
        } else {
            return await this.getLateNightRestaurants();
        }
    }
    
    /**
     * 예산별 추천
     */
    async recommendByBudget(budget) {
        if (!this.searchAgent) return [];
        
        let priceRange;
        if (budget < 10000) {
            priceRange = '저렴';
        } else if (budget < 20000) {
            priceRange = '보통';
        } else {
            priceRange = '비싼';
        }
        
        return await this.searchAgent.search({ priceRange });
    }
    
    /**
     * 그룹 추천 (여러 사용자 선호도 고려)
     */
    async recommendForGroup(userIds) {
        if (!this.preferenceAgent || !this.searchAgent) return [];
        
        const restaurants = await this.searchAgent.search({});
        const groupScores = new Map();
        
        // 각 사용자의 선호도 점수 합산
        for (const userId of userIds) {
            for (const restaurant of restaurants) {
                const score = this.preferenceAgent.calculatePreferenceScore(userId, restaurant);
                const currentScore = groupScores.get(restaurant.id) || 0;
                groupScores.set(restaurant.id, currentScore + score);
            }
        }
        
        // 평균 점수 계산 및 정렬
        const scored = restaurants.map(r => ({
            ...r,
            groupScore: (groupScores.get(r.id) || 0) / userIds.length
        }));
        
        scored.sort((a, b) => b.groupScore - a.groupScore);
        
        return scored.slice(0, 10);
    }
    
    /**
     * 추천 이유 생성
     */
    generateRecommendationReason(restaurant, situation) {
        const reasons = [];
        
        if (restaurant.rating >= 4.5) {
            reasons.push(`⭐ ${restaurant.rating}점의 높은 평점`);
        }
        
        if (restaurant.features?.some(f => f.includes('인기'))) {
            reasons.push('🔥 현지인들에게 인기 많은 곳');
        }
        
        const situationReasons = {
            '데이트': restaurant.features?.some(f => f.includes('뷰')) ? '🌃 멋진 뷰를 감상할 수 있어요' : '',
            '가족모임': restaurant.features?.some(f => f.includes('룸')) ? '👨‍👩‍👧‍👦 단체룸이 있어요' : '',
            '회식': restaurant.features?.some(f => f.includes('단체')) ? '🍻 단체 예약 가능해요' : '',
            '혼밥': restaurant.features?.some(f => f.includes('1인')) ? '🍽️ 혼자서도 편하게' : ''
        };
        
        const reason = situationReasons[situation];
        if (reason) reasons.push(reason);
        
        if (restaurant.specialty) {
            reasons.push(`🍳 ${restaurant.specialty} 전문`);
        }
        
        return reasons.join(' | ');
    }
}

module.exports = RecommendationAgent;