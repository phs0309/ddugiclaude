import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class VisitBusanService {
    constructor() {
        this.restaurants = [];
        this.loadData();
    }

    // 한국 시간 가져오기
    getKoreaHour() {
        const now = new Date();
        const koreaDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        return koreaDate.getHours();
    }

    loadData() {
        try {
            const csvPath = join(__dirname, '..', 'R_data', '비짓부산_cleaned_reviews.csv');
            const csvContent = fs.readFileSync(csvPath, 'utf-8');
            const lines = csvContent.split('\n');
            const headers = lines[0].split(',');
            
            this.restaurants = [];
            
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                
                const values = this.parseCSVLine(line);
                if (values.length < headers.length) continue;
                
                const restaurant = this.createRestaurantObject(headers, values);
                if (restaurant && restaurant.name && restaurant.name.trim()) {
                    this.restaurants.push(restaurant);
                }
            }
            
            console.log(`비짓부산 맛집 데이터 로드 완료: ${this.restaurants.length}개`);
        } catch (error) {
            console.error('비짓부산 데이터 로드 실패:', error);
            this.restaurants = [];
        }
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // skip next quote
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values;
    }

    createRestaurantObject(headers, values) {
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = values[index] || '';
        });

        // 필수 필드가 없으면 제외
        if (!obj.MAIN_TITLE || !obj.GUGUN_NM) {
            return null;
        }

        return {
            id: obj.UC_SEQ || Math.random().toString(36).substring(7),
            name: obj.MAIN_TITLE.trim(),
            address: `부산 ${obj.GUGUN_NM} ${obj.ADDR1 || ''}`.trim(),
            description: this.cleanDescription(obj.ITEMCNTNTS || ''),
            area: obj.GUGUN_NM,
            category: this.determineCategory(obj.RPRSNTV_MENU, obj.MAIN_TITLE),
            phone: obj.CNTCT_TEL || '',
            menu: obj.RPRSNTV_MENU || '',
            rating: parseFloat(obj.google_rating) || 0,
            reviewCount: parseInt(obj.google_review_count) || 0,
            lat: parseFloat(obj.LAT) || parseFloat(obj.google_lat) || 0,
            lng: parseFloat(obj.LNG) || parseFloat(obj.google_lng) || 0,
            image: obj.MAIN_IMG_NORMAL || obj.MAIN_IMG_THUMB || '',
            homepage: obj.HOMEPAGE_URL || '',
            hours: obj.USAGE_DAY_WEEK_AND_TIME || '',
            reviews: [
                obj.review_1_text,
                obj.review_2_text,
                obj.review_3_text,
                obj.review_4_text,
                obj.review_5_text
            ].filter(review => review && review.trim())
        };
    }

    cleanDescription(description) {
        if (!description) return '';
        return description
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 200);
    }

    determineCategory(menu, title) {
        if (!menu && !title) return '기타';
        
        const text = `${menu} ${title}`.toLowerCase();
        
        if (text.includes('국밥') || text.includes('돼지국밥')) return '한식';
        if (text.includes('회') || text.includes('횟집') || text.includes('수산') || text.includes('해산물')) return '해산물';
        if (text.includes('갈비') || text.includes('고기') || text.includes('삼겹살')) return '한식';
        if (text.includes('면') || text.includes('국수') || text.includes('밀면')) return '한식';
        if (text.includes('치킨') || text.includes('닭') || text.includes('chicken')) return '치킨';
        if (text.includes('카페') || text.includes('coffee') || text.includes('커피')) return '카페';
        if (text.includes('떡볶이') || text.includes('분식')) return '분식';
        if (text.includes('중국') || text.includes('중식') || text.includes('짜장')) return '중식';
        if (text.includes('일식') || text.includes('초밥') || text.includes('라멘')) return '일식';
        if (text.includes('양식') || text.includes('파스타') || text.includes('피자')) return '양식';
        if (text.includes('빵') || text.includes('베이커리') || text.includes('케이크')) return '베이커리';
        
        return '한식'; // 기본값
    }

    // 모든 맛집 가져오기
    getAllRestaurants() {
        return this.restaurants;
    }

    // 지역별 맛집 검색
    getRestaurantsByArea(area) {
        return this.restaurants.filter(restaurant => 
            restaurant.area && restaurant.area.includes(area)
        );
    }

    // 카테고리별 맛집 검색
    getRestaurantsByCategory(category) {
        return this.restaurants.filter(restaurant => 
            restaurant.category && restaurant.category.includes(category)
        );
    }

    // 평점별 맛집 검색 (4.0 이상)
    getHighRatedRestaurants(minRating = 4.0) {
        return this.restaurants.filter(restaurant => 
            restaurant.rating >= minRating && restaurant.reviewCount >= 10
        );
    }

    // 키워드로 맛집 검색
    searchRestaurants(keyword) {
        const searchTerm = keyword.toLowerCase();
        return this.restaurants.filter(restaurant => 
            restaurant.name.toLowerCase().includes(searchTerm) ||
            restaurant.description.toLowerCase().includes(searchTerm) ||
            restaurant.menu.toLowerCase().includes(searchTerm) ||
            restaurant.area.toLowerCase().includes(searchTerm)
        );
    }

    // 복합 조건으로 맛집 검색
    findRestaurants(criteria) {
        let results = [...this.restaurants];

        // 시간대별 필터링 추가
        if (criteria.timeHour !== undefined) {
            const timeBasedRecs = this.getTimeBasedRecommendations(criteria.timeHour);
            
            // 시간대 맞춤 필터링이 있으면 우선 적용
            if (timeBasedRecs.restaurants.length > 0 && !criteria.area && !criteria.category && !criteria.keyword) {
                results = timeBasedRecs.restaurants;
            } else {
                // 시간대에 맞는 추가 가중치 부여
                const timeRelevantIds = new Set(timeBasedRecs.restaurants.map(r => r.id));
                results.forEach(r => {
                    r.timeRelevant = timeRelevantIds.has(r.id);
                });
            }
        }

        if (criteria.area) {
            results = results.filter(restaurant => 
                restaurant.area && restaurant.area.includes(criteria.area)
            );
        }

        if (criteria.category) {
            results = results.filter(restaurant => 
                restaurant.category && restaurant.category.includes(criteria.category)
            );
        }

        if (criteria.keyword) {
            const searchTerm = criteria.keyword.toLowerCase();
            results = results.filter(restaurant => 
                restaurant.name.toLowerCase().includes(searchTerm) ||
                restaurant.description.toLowerCase().includes(searchTerm) ||
                restaurant.menu.toLowerCase().includes(searchTerm)
            );
        }

        if (criteria.minRating) {
            results = results.filter(restaurant => 
                restaurant.rating >= criteria.minRating
            );
        }

        // 평점 순으로 정렬 (시간 관련성도 고려)
        results.sort((a, b) => {
            // 시간대 관련성 우선 고려
            if (a.timeRelevant !== b.timeRelevant) {
                return b.timeRelevant ? 1 : -1;
            }
            
            // 그 다음 평점 순
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
        });

        return results;
    }

    // 랜덤 맛집 추천
    getRandomRestaurants(count = 3) {
        const shuffled = [...this.restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    // 시간대별 맛집 추천 (한국 시간 기준)
    getTimeBasedRecommendations(hour = this.getKoreaHour()) {
        let mealType = '';
        let categories = [];
        let keywords = [];

        if (hour >= 6 && hour < 11) {
            // 아침 (6-11시)
            mealType = '아침';
            categories = ['카페', '베이커리'];
            keywords = ['아침', '커피', '빵', '토스트', '샌드위치'];
        } else if (hour >= 11 && hour < 15) {
            // 점심 (11-15시)
            mealType = '점심';
            categories = ['한식', '분식', '중식', '일식'];
            keywords = ['국밥', '정식', '백반', '덮밥', '면', '국수', '짜장면', '김밥'];
        } else if (hour >= 15 && hour < 18) {
            // 간식/카페 시간 (15-18시)
            mealType = '간식';
            categories = ['카페', '베이커리', '분식'];
            keywords = ['커피', '케이크', '떡볶이', '튀김', '호떡'];
        } else if (hour >= 18 && hour < 22) {
            // 저녁 (18-22시)
            mealType = '저녁';
            categories = ['한식', '해산물', '양식', '중식', '일식'];
            keywords = ['갈비', '삼겹살', '회', '파스타', '고기', '구이', '찜', '정식'];
        } else {
            // 야식 (22-6시)
            mealType = '야식';
            categories = ['한식', '치킨', '분식'];
            keywords = ['치킨', '족발', '곱창', '라면', '떡볶이', '안주', '술집'];
        }

        const results = this.restaurants.filter(restaurant => {
            // 카테고리 매칭
            const categoryMatch = categories.some(cat => 
                restaurant.category && restaurant.category.includes(cat)
            );
            
            // 키워드 매칭 (이름, 메뉴, 설명에서)
            const keywordMatch = keywords.some(keyword => 
                restaurant.name.toLowerCase().includes(keyword) ||
                restaurant.menu.toLowerCase().includes(keyword) ||
                restaurant.description.toLowerCase().includes(keyword)
            );

            return categoryMatch || keywordMatch;
        });

        // 평점 순으로 정렬
        results.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
        });

        return {
            mealType,
            hour,
            restaurants: results.slice(0, 12), // 최대 12개
            message: this.getMealTimeMessage(mealType, hour)
        };
    }

    getMealTimeMessage(mealType, hour) {
        const messages = {
            '아침': `좋은 아침이다이가! ☀️ 하루를 시작하는 든든한 아침 먹을 곳 추천해줄게!`,
            '점심': `점심시간이다! 🍚 배고프지? 맛있는 점심 한 끼 어떠카?`,
            '간식': `간식시간이네~ ☕ 달콤한 디저트나 커피 한 잔 어때?`,
            '저녁': `저녁시간이다! 🌆 오늘 하루 수고했으니 맛있는 거 먹어야지!`,
            '야식': `야식시간이네! 🌙 밤늦게까지 고생하니 든든한 야식 어떠카?`
        };
        
        return messages[mealType] || `맛있는 거 먹고 싶을 시간이다! 🍽️`;
    }

    // 위치 질문 메시지 생성
    getLocationInquiryMessage(mealType, currentHour) {
        const timeMessages = {
            '아침': `좋은 아침이다이가! ☀️ 아침 먹을 곳을 찾고 있구나?`,
            '점심': `점심시간이다! 🍚 배고플 텐데 어느 동네에서 먹을 거야?`,
            '간식': `간식시간이네~ ☕ 달콤한 걸 찾고 있나?`,
            '저녁': `저녁시간이다! 🌆 맛있는 거 먹고 싶구나?`,
            '야식': `야식시간이네! 🌙 밤늦게 뭔가 먹고 싶지?`
        };

        const baseMessage = timeMessages[mealType] || `마! 뚜기다이가! 🐧 맛집을 찾고 있구나?`;

        const locationOptions = [
            '🏖️ **해운대/센텀** - 바다 보면서 먹기 좋은 곳',
            '🏢 **서면** - 부산의 중심가, 다양한 맛집',  
            '🎭 **남포동/자갈치** - 전통시장과 문화거리',
            '🌉 **광안리** - 야경 맛집의 성지',
            '🏫 **부산대/장전동** - 젊은 분위기의 맛집들',
            '✈️ **강서구** - 공항 근처 숨은 맛집',
            '🏛️ **동래** - 전통과 역사가 있는 맛집들',
            '🏪 **기장** - 신선한 해산물과 자연'
        ];

        return `${baseMessage}

어느 동네에서 먹을 건지 말해봐라! 

${locationOptions.join('\n')}

또는 "근처 맛집" 이라고 하면 현재 위치 기준으로 추천해줄게! 📍`;
    }

    // 위치 정보 감지 여부 확인
    hasLocationInfo(query) {
        const lowerQuery = query.toLowerCase();
        
        // 지역 키워드들
        const locationKeywords = [
            '해운대', '센텀', '서면', '부산진', '남포동', '중구', '자갈치', 
            '광안리', '수영구', '기장', '기장군', '동래', '온천장', '동래구',
            '부산대', '장전동', '금정구', '태종대', '영도', '영도구', 
            '하단', '사하구', '연산동', '연제구', '사직', '덕천', '북구', 
            '강서구', '김해공항', '범일동', '국제시장'
        ];
        
        // 위치 관련 표현들
        const locationExpressions = [
            '근처', '주변', '앞', '뒤', '옆', '가까운', '인근', '주위', 
            '동네', '지역', '구', '시', '동', '번지', '로', '길'
        ];
        
        // 명확한 지역명이 있는지 확인
        const hasExplicitLocation = locationKeywords.some(keyword => 
            lowerQuery.includes(keyword)
        );
        
        // 위치 관련 표현이 있는지 확인  
        const hasLocationExpression = locationExpressions.some(expr => 
            lowerQuery.includes(expr)
        );
        
        return hasExplicitLocation || hasLocationExpression;
    }

    // 일반적인 음식 요청인지 확인 (위치 없이)
    isGeneralFoodQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        const foodKeywords = [
            '맛집', '음식', '먹을', '식당', '요리', '메뉴', '추천', 
            '돼지국밥', '밀면', '회', '갈비', '치킨', '족발', '곱창',
            '국밥', '면', '파스타', '피자', '초밥', '삼겹살', '냉면',
            '아침', '점심', '저녁', '야식', '간식', '디저트', '커피'
        ];
        
        const generalQuestions = [
            '뭐', '어디', '어떤', '추천', '좋은', '맛있는', '유명한'
        ];
        
        const hasFoodKeyword = foodKeywords.some(keyword => 
            lowerQuery.includes(keyword)
        );
        
        const hasGeneralQuestion = generalQuestions.some(question => 
            lowerQuery.includes(question)
        );
        
        return hasFoodKeyword || hasGeneralQuestion;
    }

    // 사용자 질문 분석하여 검색 조건 추출
    analyzeUserQuery(query, currentHour = this.getKoreaHour()) {
        const criteria = {};
        const lowerQuery = query.toLowerCase();
        
        // 위치 정보 검사 추가
        criteria.hasLocation = this.hasLocationInfo(query);
        criteria.isGeneralFoodQuery = this.isGeneralFoodQuery(query);
        criteria.needsLocationClarification = !criteria.hasLocation && criteria.isGeneralFoodQuery;

        // 시간대 키워드 분석 추가
        if (lowerQuery.includes('아침') || lowerQuery.includes('모닝')) {
            criteria.mealTime = 'morning';
            criteria.timeHour = 9;
        } else if (lowerQuery.includes('점심') || lowerQuery.includes('런치')) {
            criteria.mealTime = 'lunch';
            criteria.timeHour = 12;
        } else if (lowerQuery.includes('간식') || lowerQuery.includes('디저트') || lowerQuery.includes('커피')) {
            criteria.mealTime = 'snack';
            criteria.timeHour = 16;
        } else if (lowerQuery.includes('저녁') || lowerQuery.includes('디너')) {
            criteria.mealTime = 'dinner';
            criteria.timeHour = 19;
        } else if (lowerQuery.includes('야식') || lowerQuery.includes('밤') || lowerQuery.includes('늦은')) {
            criteria.mealTime = 'latenight';
            criteria.timeHour = 23;
        } else {
            // 시간 키워드가 없으면 현재 시간 사용
            criteria.timeHour = currentHour;
        }

        // 지역 키워드 매핑
        const areaKeywords = {
            '해운대': ['해운대', '센텀'],
            '서면': ['서면', '부산진'],
            '남포동': ['남포동', '중구', '자갈치'],
            '광안리': ['광안리', '수영구'],
            '기장군': ['기장', '기장군'],
            '동래구': ['동래', '온천장'],
            '금정구': ['부산대', '장전동', '금정구'],
            '영도구': ['태종대', '영도', '영도구'],
            '사하구': ['하단', '사하구'],
            '연제구': ['연산동', '연제구'],
            '북구': ['사직', '덕천', '북구'],
            '강서구': ['강서구', '김해공항']
        };

        // 음식 카테고리 키워드 매핑
        const categoryKeywords = {
            '한식': ['한식', '국밥', '갈비', '삼계탕', '파전', '족발', '곱창', '한정식', '밥', '찌개'],
            '해산물': ['해산물', '회', '횟집', '곰장어', '멸치', '전복', '조개', '수산', '물회'],
            '분식': ['분식', '떡볶이', '당면', '김밥'],
            '카페': ['카페', '커피', '디저트', '베이커리'],
            '치킨': ['치킨', '후라이드', '양념', '닭'],
            '중식': ['중국', '중식', '짜장면', '짬뽕'],
            '일식': ['일식', '초밥', '라멘', '우동'],
            '양식': ['양식', '파스타', '피자', '스테이크']
        };

        // 특정 음식 키워드
        const foodKeywords = [
            '돼지국밥', '밀면', '회', '갈비', '파전', '곰장어', '족발', '곱창', 
            '치킨', '호떡', '멸치', '전복', '조개', '삼겹살', '냉면', '국수'
        ];

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
        for (const food of foodKeywords) {
            if (lowerQuery.includes(food)) {
                criteria.keyword = food;
                break;
            }
        }

        // 평점 관련 키워드 분석
        if (lowerQuery.includes('맛있') || lowerQuery.includes('평점') || lowerQuery.includes('유명')) {
            criteria.minRating = 4.0;
        }

        return criteria;
    }
}

export default new VisitBusanService();