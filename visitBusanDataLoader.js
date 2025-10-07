const fs = require('fs');
const csv = require('csv-parser');

// 비짓부산 CSV 데이터를 읽어서 뚜기 AI 형식으로 변환하는 함수 (Google Places 리뷰 포함)
function loadVisitBusanData(csvFilePath = './R_data/비짓부산_cleaned_reviews.csv') {
    const restaurants = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath, { encoding: 'utf8' })
            .pipe(csv())
            .on('data', (row) => {
                // CSV 데이터를 뚜기 AI 형식으로 변환 (Google Places 리뷰 포함)
                const restaurant = {
                    id: parseInt(row.UC_SEQ) || Math.random() * 10000,
                    name: row.MAIN_TITLE || '',
                    address: row.ADDR1 || row.google_address || '',
                    description: row.ITEMCNTNTS || '',
                    priceRange: extractPriceRange(row.RPRSNTV_MENU),
                    category: categorizeRestaurant(row.MAIN_TITLE, row.RPRSNTV_MENU, row.ITEMCNTNTS),
                    area: mapGugunToArea(row.GUGUN_NM),
                    specialties: extractSpecialties(row.RPRSNTV_MENU),
                    coordinates: { 
                        lat: parseFloat(row.LAT) || parseFloat(row.google_lat) || 0,
                        lng: parseFloat(row.LNG) || parseFloat(row.google_lng) || 0
                    },
                    contact: row.CNTCT_TEL || '',
                    hours: row.USAGE_DAY_WEEK_AND_TIME || '',
                    image: row.MAIN_IMG_NORMAL || '',
                    // Google Places 데이터 추가
                    googlePlaceId: row.google_place_id || '',
                    googleName: row.google_name || '',
                    googleRating: parseFloat(row.google_rating) || 0,
                    googleReviewCount: parseInt(row.google_review_count) || 0,
                    // 리뷰 텍스트 (저자 정보 제거됨)
                    reviews: [
                        row.review_1_text || '',
                        row.review_2_text || '',
                        row.review_3_text || '',
                        row.review_4_text || '',
                        row.review_5_text || ''
                    ].filter(review => review.length > 0),
                    reviewSummary: generateReviewSummary(row.ITEMCNTNTS, row.RPRSNTV_MENU, row.review_1_text),
                    visitBusanId: row.UC_SEQ
                };
                
                // 유효한 데이터만 추가 (필수 필드 체크)
                if (restaurant.name && restaurant.area && restaurant.coordinates.lat && restaurant.coordinates.lng) {
                    restaurants.push(restaurant);
                }
            })
            .on('end', () => {
                console.log(`비짓부산 데이터 로드 완료: ${restaurants.length}개 맛집`);
                resolve(restaurants);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

// 가격대 추출 함수
function extractPriceRange(menu) {
    if (!menu) return '가격 정보 없음';
    
    const priceMatch = menu.match(/￦([\d,\-]+)/g);
    if (priceMatch) {
        return priceMatch.join(', ');
    }
    
    return '가격 정보 없음';
}

// 카테고리 분류 함수
function categorizeRestaurant(title, menu, description) {
    const text = `${title} ${menu} ${description}`.toLowerCase();
    
    if (text.includes('갈비') || text.includes('한우') || text.includes('소고기')) return '한식';
    if (text.includes('해산물') || text.includes('회') || text.includes('조개') || text.includes('낙지') || text.includes('아구')) return '해산물';
    if (text.includes('밀면') || text.includes('국수') || text.includes('냉면')) return '면요리';
    if (text.includes('국밥') || text.includes('탕') || text.includes('찌개')) return '국물요리';
    if (text.includes('치킨') || text.includes('통닭')) return '치킨';
    if (text.includes('샤브샤브') || text.includes('훠궈')) return '중식';
    if (text.includes('돌솥') || text.includes('비빔') || text.includes('정식')) return '한식';
    if (text.includes('곤드레') || text.includes('산채')) return '건강식';
    
    return '한식'; // 기본값
}

// 구군을 뚜기 AI 지역으로 매핑
function mapGugunToArea(gugun) {
    const areaMap = {
        '해운대구': '해운대',
        '부산진구': '서면',
        '동래구': '동래',
        '연제구': '연산',
        '남구': '경성대',
        '중구': '남포동',
        '서구': '서구',
        '영도구': '영도',
        '금정구': '부산대',
        '북구': '화명',
        '사상구': '사상',
        '강서구': '강서',
        '수영구': '광안리',
        '사하구': '하단',
        '기장군': '기장',
        '진구': '서면'
    };
    
    return areaMap[gugun] || gugun;
}

// 특선 메뉴 추출
function extractSpecialties(menu) {
    if (!menu) return [];
    
    const specialties = menu.split(',').map(item => 
        item.replace(/￦[\d,\-]+/g, '').trim()
    ).filter(item => item.length > 0);
    
    return specialties.slice(0, 3); // 최대 3개까지
}

// 리뷰 요약 생성 (Google Places 리뷰 포함)
function generateReviewSummary(description, menu, firstReview) {
    // Google 리뷰가 있으면 우선 사용
    if (firstReview && firstReview.length > 10) {
        const reviewSummary = firstReview.replace(/\n/g, ' ').trim();
        return reviewSummary.length > 100 ? reviewSummary.substring(0, 100) + '...' : reviewSummary;
    }
    
    // 기본 설명 사용
    if (description) {
        const summary = description.replace(/\n/g, ' ').trim();
        return summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
    }
    
    return '부산 맛집으로 유명한 곳';
}

module.exports = {
    loadVisitBusanData
};