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

    // 랜덤 맛집 추천
    getRandomRestaurants(count = 3) {
        const shuffled = [...this.restaurants].sort(() => 0.5 - Math.random());
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