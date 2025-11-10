// 사용자 선호도 학습 에이전트
class UserPreferenceAgent {
    constructor() {
        this.name = "사용자 선호도 분석 에이전트";
        this.description = "사용자의 검색 패턴과 선택을 학습하여 맞춤형 추천";
        this.userPreferences = new Map();
    }
    
    /**
     * 사용자 프로필 초기화 또는 로드
     */
    initUserProfile(userId) {
        if (!this.userPreferences.has(userId)) {
            this.userPreferences.set(userId, {
                favoriteCategories: {},
                favoriteAreas: {},
                pricePreference: {},
                searchHistory: [],
                savedRestaurants: [],
                averageRating: 4.0,
                dietaryRestrictions: [],
                lastUpdated: new Date()
            });
        }
        return this.userPreferences.get(userId);
    }
    
    /**
     * 사용자 행동 기록
     */
    recordUserAction(userId, action) {
        const profile = this.initUserProfile(userId);
        
        switch (action.type) {
            case 'search':
                this.recordSearch(profile, action.data);
                break;
            case 'view':
                this.recordView(profile, action.data);
                break;
            case 'save':
                this.recordSave(profile, action.data);
                break;
            case 'rate':
                this.recordRating(profile, action.data);
                break;
        }
        
        profile.lastUpdated = new Date();
        this.saveToLocalStorage(userId, profile);
    }
    
    /**
     * 검색 기록
     */
    recordSearch(profile, searchData) {
        profile.searchHistory.push({
            query: searchData.query,
            timestamp: new Date(),
            results: searchData.resultsCount
        });
        
        // 최근 100개만 유지
        if (profile.searchHistory.length > 100) {
            profile.searchHistory = profile.searchHistory.slice(-100);
        }
        
        // 카테고리 선호도 업데이트
        if (searchData.category) {
            profile.favoriteCategories[searchData.category] = 
                (profile.favoriteCategories[searchData.category] || 0) + 1;
        }
        
        // 지역 선호도 업데이트
        if (searchData.area) {
            profile.favoriteAreas[searchData.area] = 
                (profile.favoriteAreas[searchData.area] || 0) + 1;
        }
    }
    
    /**
     * 조회 기록
     */
    recordView(profile, restaurant) {
        // 카테고리 선호도 증가
        if (restaurant.category) {
            profile.favoriteCategories[restaurant.category] = 
                (profile.favoriteCategories[restaurant.category] || 0) + 0.5;
        }
        
        // 지역 선호도 증가
        if (restaurant.area) {
            profile.favoriteAreas[restaurant.area] = 
                (profile.favoriteAreas[restaurant.area] || 0) + 0.5;
        }
        
        // 가격대 선호도
        const priceLevel = this.getPriceLevel(restaurant.priceRange);
        profile.pricePreference[priceLevel] = 
            (profile.pricePreference[priceLevel] || 0) + 0.5;
    }
    
    /**
     * 저장 기록
     */
    recordSave(profile, restaurant) {
        if (!profile.savedRestaurants.find(r => r.id === restaurant.id)) {
            profile.savedRestaurants.push({
                id: restaurant.id,
                name: restaurant.name,
                category: restaurant.category,
                area: restaurant.area,
                savedAt: new Date()
            });
            
            // 저장은 강한 선호 신호
            if (restaurant.category) {
                profile.favoriteCategories[restaurant.category] = 
                    (profile.favoriteCategories[restaurant.category] || 0) + 2;
            }
            
            if (restaurant.area) {
                profile.favoriteAreas[restaurant.area] = 
                    (profile.favoriteAreas[restaurant.area] || 0) + 2;
            }
        }
    }
    
    /**
     * 평점 기록
     */
    recordRating(profile, ratingData) {
        const { restaurantId, rating } = ratingData;
        
        // 평균 선호 평점 업데이트
        const currentAvg = profile.averageRating;
        const ratingCount = profile.searchHistory.length || 1;
        profile.averageRating = (currentAvg * ratingCount + rating) / (ratingCount + 1);
    }
    
    /**
     * 가격대 레벨 판단
     */
    getPriceLevel(priceRange) {
        if (!priceRange) return '보통';
        
        const minPrice = parseInt(priceRange.match(/\d+/)?.[0] || 0);
        
        if (minPrice < 10000) return '저렴';
        if (minPrice < 20000) return '보통';
        if (minPrice < 30000) return '약간비싼';
        return '비싼';
    }
    
    /**
     * 사용자 선호도 기반 점수 계산
     */
    calculatePreferenceScore(userId, restaurant) {
        const profile = this.initUserProfile(userId);
        let score = 0;
        
        // 카테고리 선호도 (40%)
        const categoryScore = profile.favoriteCategories[restaurant.category] || 0;
        const maxCategoryScore = Math.max(...Object.values(profile.favoriteCategories), 1);
        score += (categoryScore / maxCategoryScore) * 40;
        
        // 지역 선호도 (30%)
        const areaScore = profile.favoriteAreas[restaurant.area] || 0;
        const maxAreaScore = Math.max(...Object.values(profile.favoriteAreas), 1);
        score += (areaScore / maxAreaScore) * 30;
        
        // 가격대 선호도 (20%)
        const priceLevel = this.getPriceLevel(restaurant.priceRange);
        const priceScore = profile.pricePreference[priceLevel] || 0;
        const maxPriceScore = Math.max(...Object.values(profile.pricePreference), 1);
        score += (priceScore / maxPriceScore) * 20;
        
        // 평점 선호도 (10%)
        const ratingDiff = Math.abs((restaurant.rating || 4.0) - profile.averageRating);
        const ratingScore = Math.max(0, 1 - ratingDiff / 5) * 10;
        score += ratingScore;
        
        return Math.round(score);
    }
    
    /**
     * 개인화 추천
     */
    async getPersonalizedRecommendations(userId, restaurants, limit = 10) {
        // 각 맛집에 선호도 점수 추가
        const scoredRestaurants = restaurants.map(restaurant => ({
            ...restaurant,
            preferenceScore: this.calculatePreferenceScore(userId, restaurant)
        }));
        
        // 점수순 정렬
        scoredRestaurants.sort((a, b) => b.preferenceScore - a.preferenceScore);
        
        return scoredRestaurants.slice(0, limit);
    }
    
    /**
     * 사용자 프로필 분석
     */
    analyzeUserProfile(userId) {
        const profile = this.initUserProfile(userId);
        
        // 가장 선호하는 카테고리
        const topCategories = Object.entries(profile.favoriteCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([cat]) => cat);
        
        // 가장 선호하는 지역
        const topAreas = Object.entries(profile.favoriteAreas)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([area]) => area);
        
        // 선호 가격대
        const topPriceRange = Object.entries(profile.pricePreference)
            .sort((a, b) => b[1] - a[1])[0]?.[0] || '보통';
        
        return {
            userId,
            topCategories,
            topAreas,
            preferredPriceRange: topPriceRange,
            averageRating: profile.averageRating,
            savedCount: profile.savedRestaurants.length,
            searchCount: profile.searchHistory.length,
            lastActive: profile.lastUpdated
        };
    }
    
    /**
     * 로컬 스토리지 저장
     */
    saveToLocalStorage(userId, profile) {
        if (typeof window !== 'undefined' && window.localStorage) {
            const key = `user_preference_${userId}`;
            window.localStorage.setItem(key, JSON.stringify(profile));
        }
    }
    
    /**
     * 로컬 스토리지에서 로드
     */
    loadFromLocalStorage(userId) {
        if (typeof window !== 'undefined' && window.localStorage) {
            const key = `user_preference_${userId}`;
            const data = window.localStorage.getItem(key);
            
            if (data) {
                const profile = JSON.parse(data);
                this.userPreferences.set(userId, profile);
                return profile;
            }
        }
        
        return this.initUserProfile(userId);
    }
    
    /**
     * 유사 사용자 찾기 (협업 필터링)
     */
    findSimilarUsers(userId, allUsers) {
        const userProfile = this.initUserProfile(userId);
        const similarities = [];
        
        allUsers.forEach(otherUserId => {
            if (otherUserId === userId) return;
            
            const otherProfile = this.userPreferences.get(otherUserId);
            if (!otherProfile) return;
            
            // 코사인 유사도 계산
            const similarity = this.calculateSimilarity(userProfile, otherProfile);
            similarities.push({ userId: otherUserId, similarity });
        });
        
        // 유사도 순 정렬
        similarities.sort((a, b) => b.similarity - a.similarity);
        
        return similarities.slice(0, 5);
    }
    
    /**
     * 두 사용자 간 유사도 계산
     */
    calculateSimilarity(profile1, profile2) {
        let similarity = 0;
        let count = 0;
        
        // 카테고리 선호도 비교
        Object.keys(profile1.favoriteCategories).forEach(cat => {
            if (profile2.favoriteCategories[cat]) {
                similarity += 1;
                count += 1;
            }
        });
        
        // 지역 선호도 비교
        Object.keys(profile1.favoriteAreas).forEach(area => {
            if (profile2.favoriteAreas[area]) {
                similarity += 1;
                count += 1;
            }
        });
        
        // 평점 선호도 비교
        const ratingDiff = Math.abs(profile1.averageRating - profile2.averageRating);
        similarity += Math.max(0, 1 - ratingDiff / 5);
        count += 1;
        
        return count > 0 ? similarity / count : 0;
    }
}

module.exports = UserPreferenceAgent;