const InstagramTagAnalyzer = require('./instagram-tag-analyzer');
const restaurantData = require('./restaurantData');

class TagRestaurantMatcher {
    constructor() {
        this.tagAnalyzer = new InstagramTagAnalyzer();
        this.restaurants = restaurantData.restaurants || [];
    }

    // 해시태그를 기반으로 관련 맛집 찾기
    findRestaurantsByTags(hashtags) {
        // 해시태그 분석
        const analysis = this.tagAnalyzer.analyzeHashtags(hashtags);
        
        // 매칭된 맛집들
        let matchedRestaurants = [];
        
        // 지역 기반 매칭
        if (analysis.areas.length > 0) {
            const areaMatches = this.restaurants.filter(restaurant => {
                return analysis.areas.some(area => {
                    return restaurant.area.includes(area) || area.includes(restaurant.area);
                });
            });
            matchedRestaurants = matchedRestaurants.concat(areaMatches);
        }

        // 음식 타입 기반 매칭
        if (analysis.foodTypes.length > 0) {
            const foodMatches = this.restaurants.filter(restaurant => {
                return analysis.foodTypes.some(foodType => {
                    return restaurant.specialties.some(specialty => 
                        specialty.includes(foodType) || foodType.includes(specialty)
                    ) || restaurant.category.includes(foodType) || foodType.includes(restaurant.category);
                });
            });
            matchedRestaurants = matchedRestaurants.concat(foodMatches);
        }

        // 키워드 기반 매칭 (식당 이름, 설명에서)
        hashtags.forEach(tag => {
            const cleanTag = tag.replace('#', '').toLowerCase();
            if (cleanTag.length >= 2) {
                const keywordMatches = this.restaurants.filter(restaurant => {
                    return restaurant.name.toLowerCase().includes(cleanTag) ||
                           restaurant.description.toLowerCase().includes(cleanTag) ||
                           restaurant.specialties.some(specialty => 
                               specialty.toLowerCase().includes(cleanTag)
                           );
                });
                matchedRestaurants = matchedRestaurants.concat(keywordMatches);
            }
        });

        // 중복 제거 및 점수 계산
        const uniqueRestaurants = this.removeDuplicatesAndScore(matchedRestaurants, analysis);
        
        return {
            analysis,
            restaurants: uniqueRestaurants.slice(0, 10), // 상위 10개
            totalFound: uniqueRestaurants.length,
            searchSummary: this.generateSearchSummary(analysis, uniqueRestaurants.length)
        };
    }

    // 중복 제거 및 관련도 점수 계산
    removeDuplicatesAndScore(restaurants, analysis) {
        const restaurantMap = new Map();
        
        restaurants.forEach(restaurant => {
            if (!restaurantMap.has(restaurant.id)) {
                restaurantMap.set(restaurant.id, {
                    ...restaurant,
                    relevanceScore: 0,
                    matchReasons: []
                });
            }
            
            const existing = restaurantMap.get(restaurant.id);
            existing.relevanceScore += 1;
        });

        // 관련도 점수 계산
        restaurantMap.forEach((restaurant, id) => {
            let score = restaurant.relevanceScore;
            
            // 지역 일치 보너스
            analysis.areas.forEach(area => {
                if (restaurant.area.includes(area) || area.includes(restaurant.area)) {
                    score += 3;
                    restaurant.matchReasons.push(`${area} 지역 맛집`);
                }
            });
            
            // 음식 타입 일치 보너스
            analysis.foodTypes.forEach(foodType => {
                if (restaurant.specialties.some(specialty => 
                    specialty.includes(foodType) || foodType.includes(specialty)
                )) {
                    score += 2;
                    restaurant.matchReasons.push(`${foodType} 전문점`);
                }
            });
            
            restaurant.relevanceScore = score;
        });

        return Array.from(restaurantMap.values())
            .sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // 검색 결과 요약 생성
    generateSearchSummary(analysis, totalFound) {
        let summary = '';
        
        if (analysis.areas.length > 0) {
            summary += `${analysis.areas.join(', ')} 지역의 `;
        }
        
        if (analysis.foodTypes.length > 0) {
            summary += `${analysis.foodTypes.join(', ')} `;
        }
        
        summary += `맛집 ${totalFound}개를 찾았습니다.`;
        
        if (analysis.recommendations.length > 0) {
            summary += ` 추천: ${analysis.recommendations[0]}`;
        }
        
        return summary;
    }

    // 인기 태그별 맛집 추천
    getRestaurantsByPopularTags() {
        const popularTags = this.tagAnalyzer.getPopularBusanTags();
        const recommendations = {};
        
        // 지역별 추천
        popularTags.areas.forEach(areaTag => {
            const area = areaTag.replace('#', '').replace('맛집', '');
            recommendations[areaTag] = this.restaurants
                .filter(r => r.area.includes(area))
                .slice(0, 3);
        });
        
        return recommendations;
    }

    // 트렌딩 태그별 맛집 정보
    getTrendingRestaurants() {
        const trending = this.tagAnalyzer.getTrendingTags();
        const trendingWithRestaurants = trending.map(item => {
            const tag = item.tag.replace('#', '');
            const matchedRestaurants = this.findRestaurantsByTags([tag]);
            
            return {
                ...item,
                sampleRestaurants: matchedRestaurants.restaurants.slice(0, 3),
                totalRestaurants: matchedRestaurants.totalFound
            };
        });
        
        return trendingWithRestaurants;
    }

    // 해시태그 기반 맛집 루트 추천
    suggestFoodRoute(hashtags) {
        const result = this.findRestaurantsByTags(hashtags);
        
        if (result.restaurants.length < 2) {
            return {
                message: '충분한 맛집을 찾을 수 없어 루트를 생성할 수 없습니다.',
                restaurants: result.restaurants
            };
        }

        // 지역별 그룹화
        const grouped = {};
        result.restaurants.forEach(restaurant => {
            if (!grouped[restaurant.area]) {
                grouped[restaurant.area] = [];
            }
            grouped[restaurant.area].push(restaurant);
        });

        // 루트 생성
        const routes = Object.entries(grouped).map(([area, restaurants]) => ({
            area,
            restaurants: restaurants.slice(0, 3),
            description: `${area} 지역 맛집 투어 코스`
        }));

        return {
            routes,
            summary: `${Object.keys(grouped).length}개 지역에서 총 ${result.restaurants.length}개 맛집으로 구성된 투어 코스`,
            totalRestaurants: result.restaurants.length
        };
    }

    // 해시태그 통계 분석
    getHashtagStatistics(hashtags) {
        const analysis = this.tagAnalyzer.analyzeHashtags(hashtags);
        const restaurantResults = this.findRestaurantsByTags(hashtags);
        
        return {
            inputTags: hashtags.length,
            busanRelatedTags: analysis.busanRelated.length,
            identifiedAreas: analysis.areas.length,
            identifiedFoods: analysis.foodTypes.length,
            matchedRestaurants: restaurantResults.totalFound,
            coverage: {
                areas: analysis.areas,
                foods: analysis.foodTypes,
                restaurants: restaurantResults.restaurants.map(r => r.name).slice(0, 5)
            }
        };
    }
}

module.exports = TagRestaurantMatcher;