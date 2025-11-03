const fs = require('fs');
const path = require('path');

class RestaurantAI {
    constructor() {
        this.restaurants = [];
        this.loadRestaurants();
    }

    // JSON 파일에서 맛집 데이터 로드
    loadRestaurants() {
        try {
            const dataPath = path.join(__dirname, 'restaurants.json');
            const jsonData = fs.readFileSync(dataPath, 'utf-8');
            const data = JSON.parse(jsonData);
            this.restaurants = data.restaurants;
            console.log(`✅ ${this.restaurants.length}개 맛집 데이터 로드 완료`);
        } catch (error) {
            console.error('❌ 맛집 데이터 로드 실패:', error);
            this.restaurants = [];
        }
    }

    // 사용자 메시지 분석
    analyzeUserMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // 지역 키워드 매핑
        const areaMap = {
            '해운대': ['해운대', '해운대구', '센텀'],
            '서면': ['서면', '부산진구'],
            '광안리': ['광안리', '수영구'],
            '남포동': ['남포동', '중구', '자갈치'],
            '동래': ['동래', '동래구', '온천'],
            '기장': ['기장', '기장군'],
            '부산대': ['부산대', '금정구', '장전'],
            '태종대': ['태종대', '영도구', '영도'],
            '감천': ['감천', '사하구', '감천문화마을']
        };

        // 음식 카테고리 키워드
        const categoryMap = {
            '한식': ['한식', '국밥', '밀면', '파전', '족발', '보쌈'],
            '해산물': ['해산물', '회', '횟집', '아구찜', '곰장어', '멸치'],
            '간식': ['간식', '호떡', '씨앗호떡', '디저트'],
            '카페': ['카페', '커피', '아메리카노', '케이크']
        };

        // 특정 음식 키워드
        const foodKeywords = [
            '돼지국밥', '밀면', '회', '아구찜', '곰장어', '파전', 
            '족발', '보쌈', '멸치국수', '호떡', '커피'
        ];

        const analysis = {
            area: null,
            category: null,
            food: null,
            priceRange: null,
            rating: null
        };

        // 지역 분석
        for (const [area, keywords] of Object.entries(areaMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                analysis.area = area;
                break;
            }
        }

        // 카테고리 분석
        for (const [category, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                analysis.category = category;
                break;
            }
        }

        // 특정 음식 키워드
        for (const food of foodKeywords) {
            if (lowerMessage.includes(food)) {
                analysis.food = food;
                break;
            }
        }

        // 가격대 분석
        if (lowerMessage.includes('저렴') || lowerMessage.includes('싸') || lowerMessage.includes('학생')) {
            analysis.priceRange = 'low';
        } else if (lowerMessage.includes('비싸') || lowerMessage.includes('고급') || lowerMessage.includes('특별')) {
            analysis.priceRange = 'high';
        }

        // 평점 관련
        if (lowerMessage.includes('맛있') || lowerMessage.includes('유명') || lowerMessage.includes('평점')) {
            analysis.rating = 4.0;
        }

        return analysis;
    }

    // 맛집 추천 (JSON 데이터에서만 선택)
    recommendRestaurants(userMessage) {
        const analysis = this.analyzeUserMessage(userMessage);
        let candidates = [...this.restaurants];

        // 지역 필터링
        if (analysis.area) {
            candidates = candidates.filter(restaurant => {
                return restaurant.address.includes(analysis.area) || 
                       restaurant.area.includes(analysis.area);
            });
        }

        // 카테고리 필터링
        if (analysis.category) {
            candidates = candidates.filter(restaurant => 
                restaurant.category === analysis.category
            );
        }

        // 특정 음식 필터링
        if (analysis.food) {
            candidates = candidates.filter(restaurant => 
                restaurant.specialties.some(specialty => 
                    specialty.includes(analysis.food)
                ) || restaurant.name.includes(analysis.food) ||
                restaurant.description.includes(analysis.food)
            );
        }

        // 가격대 필터링
        if (analysis.priceRange === 'low') {
            candidates = candidates.filter(restaurant => {
                const maxPrice = parseInt(restaurant.priceRange.split('-')[1]);
                return maxPrice <= 15000;
            });
        } else if (analysis.priceRange === 'high') {
            candidates = candidates.filter(restaurant => {
                const maxPrice = parseInt(restaurant.priceRange.split('-')[1]);
                return maxPrice >= 30000;
            });
        }

        // 평점 필터링
        if (analysis.rating) {
            candidates = candidates.filter(restaurant => 
                restaurant.rating >= analysis.rating
            );
        }

        // 평점순으로 정렬
        candidates.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
        });

        return {
            analysis,
            restaurants: candidates.slice(0, 5),
            total: candidates.length
        };
    }

    // AI 응답 생성
    generateResponse(userMessage, recommendations) {
        const { analysis, restaurants, total } = recommendations;
        
        if (restaurants.length === 0) {
            return {
                message: "아이고, 조건에 맞는 맛집을 못 찾겠네요 😅 다른 지역이나 음식으로 다시 물어보세요!",
                restaurants: []
            };
        }

        let responseMessage = "부산 맛집 추천해드릴게요! 🍽️\n\n";
        
        if (analysis.area) {
            responseMessage += `${analysis.area} 지역에서 `;
        }
        if (analysis.food) {
            responseMessage += `${analysis.food} 맛집으로 `;
        } else if (analysis.category) {
            responseMessage += `${analysis.category} 맛집으로 `;
        }
        
        responseMessage += `${restaurants.length}곳을 추천드려요!\n\n`;
        
        // 추천 맛집 간단 소개
        if (restaurants.length > 0) {
            const topRestaurant = restaurants[0];
            responseMessage += `특히 "${topRestaurant.name}"이 평점 ${topRestaurant.rating}점으로 인기가 높아요. `;
            responseMessage += `${topRestaurant.description.substring(0, 50)}... `;
            responseMessage += `아래 카드에서 더 자세한 정보를 확인해보세요! 👇`;
        }

        return {
            message: responseMessage,
            restaurants: restaurants,
            analysis: analysis
        };
    }

    // 랜덤 추천
    getRandomRecommendations(count = 3) {
        const shuffled = [...this.restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 모든 맛집 반환
    getAllRestaurants() {
        return this.restaurants;
    }

    // 카테고리별 맛집
    getRestaurantsByCategory(category) {
        return this.restaurants.filter(restaurant => 
            restaurant.category === category
        );
    }

    // 지역별 맛집
    getRestaurantsByArea(area) {
        return this.restaurants.filter(restaurant => 
            restaurant.area.includes(area) || restaurant.address.includes(area)
        );
    }
}

module.exports = RestaurantAI;