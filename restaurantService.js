const fs = require('fs');
const path = require('path');

class RestaurantService {
    constructor() {
        this.restaurants = [];
        this.loadData();
    }

    // CSV 데이터 로드
    loadData() {
        try {
            const csvPath = path.join(__dirname, 'R_data', '비짓부산_cleaned_reviews.csv');
            console.log('🔍 데이터 로드 시작:', csvPath);
            
            const csvContent = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
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
            
            console.log(`✅ 맛집 데이터 로드 완료: ${this.restaurants.length}개`);
        } catch (error) {
            console.error('❌ 데이터 로드 실패:', error);
            this.restaurants = [];
        }
    }

    // CSV 라인 파싱 (콤마와 따옴표 처리)
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

    // 맛집 객체 생성
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
            name: this.cleanText(obj.MAIN_TITLE || '').trim(),
            address: this.cleanText(`부산 ${obj.GUGUN_NM} ${obj.ADDR1 || ''}`).trim(),
            description: this.cleanDescription(obj.ITEMCNTNTS || ''),
            area: this.cleanText(obj.GUGUN_NM || ''),
            category: this.determineCategory(obj.RPRSNTV_MENU, obj.MAIN_TITLE),
            phone: this.cleanText(obj.CNTCT_TEL || ''),
            menu: this.cleanText(obj.RPRSNTV_MENU || ''),
            rating: parseFloat(obj.google_rating) || 0,
            reviewCount: parseInt(obj.google_review_count) || 0,
            lat: parseFloat(obj.LAT) || parseFloat(obj.google_lat) || 0,
            lng: parseFloat(obj.LNG) || parseFloat(obj.google_lng) || 0,
            image: obj.MAIN_IMG_NORMAL || obj.MAIN_IMG_THUMB || '',
            homepage: obj.HOMEPAGE_URL || '',
            hours: this.cleanText(obj.USAGE_DAY_WEEK_AND_TIME || ''),
            coordinates: {
                lat: parseFloat(obj.LAT) || parseFloat(obj.google_lat) || 0,
                lng: parseFloat(obj.LNG) || parseFloat(obj.google_lng) || 0
            },
            googleRating: parseFloat(obj.google_rating) || 0,
            googleReviewCount: parseInt(obj.google_review_count) || 0,
            specialties: this.extractSpecialties(obj.RPRSNTV_MENU)
        };
    }

    // 텍스트 정리
    cleanText(text) {
        if (!text) return '';
        return text
            .replace(/\r\n/g, ' ')
            .replace(/\n/g, ' ')
            .replace(/\r/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // 설명 정리 (200자 제한)
    cleanDescription(description) {
        if (!description) return '';
        return this.cleanText(description).substring(0, 200);
    }

    // 카테고리 결정
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

    // 대표메뉴에서 특장점 추출
    extractSpecialties(menu) {
        if (!menu) return [];
        return menu.split(',').map(item => item.trim()).filter(item => item.length > 0).slice(0, 3);
    }

    // 사용자 키워드 분석
    analyzeUserQuery(message) {
        const lowerMessage = message.toLowerCase();
        const criteria = {};

        // 지역 키워드 매핑
        const areaKeywords = {
            '해운대구': ['해운대', '센텀'],
            '서면': ['서면', '부산진'],
            '중구': ['남포동', '중구', '자갈치'],
            '수영구': ['광안리', '수영구'],
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
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                criteria.area = area;
                break;
            }
        }

        // 카테고리 분석
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                criteria.category = category;
                break;
            }
        }

        // 특정 음식 키워드 분석
        for (const food of foodKeywords) {
            if (lowerMessage.includes(food)) {
                criteria.keyword = food;
                break;
            }
        }

        // 평점 관련 키워드 분석
        if (lowerMessage.includes('맛있') || lowerMessage.includes('평점') || lowerMessage.includes('유명')) {
            criteria.minRating = 4.0;
        }

        return criteria;
    }

    // 맛집 검색
    findRestaurants(criteria) {
        let results = [...this.restaurants];

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

        // 평점 순으로 정렬
        results.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
        });

        return results;
    }

    // 모든 맛집 가져오기
    getAllRestaurants() {
        return this.restaurants;
    }

    // 랜덤 맛집 추천
    getRandomRestaurants(count = 5) {
        const shuffled = [...this.restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

module.exports = new RestaurantService();