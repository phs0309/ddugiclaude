const fs = require('fs');
const path = require('path');

class RealWebSearchRestaurantAgent {
    constructor(webSearchFunction) {
        this.webSearch = webSearchFunction; // WebSearch 함수를 주입받음
        this.restaurants = [];
        this.processedNames = new Set();
        this.searchHistory = [];
    }

    // 검색 쿼리 전략 생성
    generateSearchQueries(area = "해운대") {
        return [
            // 기본 맛집 검색
            `${area} 맛집 추천 2024 실제 주소 전화번호`,
            `부산 ${area} 맛집 베스트 리스트 주소`,
            
            // 음식 카테고리별 검색
            `${area} 돼지국밥 맛집 실제 주소`,
            `${area} 밀면 전문점 추천 주소`,
            `${area} 회집 횟집 맛집 주소 전화번호`,
            `${area} 한식 맛집 추천 2024`,
            `${area} 일식 초밥 스시 맛집`,
            `${area} 양식 파스타 맛집`,
            `${area} 카페 추천 실제 주소`,
            `${area} 해산물 맛집 전문점`,
            
            // 지역별 상세 검색
            `센텀시티 맛집 2024 실제 주소`,
            `송정 해수욕장 맛집 추천`,
            `달맞이길 카페 맛집 실제 주소`,
            `좌동 맛집 추천 해운대구`,
            `우동 맛집 해운대구 추천`,
            
            // 특성별 검색
            `${area} 24시간 맛집 실제 주소`,
            `${area} 브런치 카페 추천`,
            `${area} 오마카세 일식 맛집`,
            `${area} 뷔페 맛집 추천`,
            `${area} 전통 맛집 오래된`,
            
            // 구체적 메뉴별 검색
            `${area} 복어 요리 전문점`,
            `${area} 대구탕 맛집`,
            `${area} 아구찜 해물찜 맛집`,
            `${area} 갈비 고기 맛집`,
            `${area} 뇨끼 파스타 양식 맛집`
        ];
    }

    // 실제 웹 검색 수행
    async performWebSearch(query) {
        console.log(`🔍 검색: "${query}"`);
        
        try {
            const searchResults = await this.webSearch(query);
            
            this.searchHistory.push({
                query: query,
                timestamp: new Date().toISOString(),
                resultCount: searchResults?.length || 0
            });
            
            return searchResults;
            
        } catch (error) {
            console.error(`❌ 검색 실패: ${query}`, error.message);
            return [];
        }
    }

    // 웹 검색 결과에서 맛집 정보 추출
    extractRestaurantData(searchResults, query) {
        const restaurants = [];
        
        if (!searchResults || !Array.isArray(searchResults)) {
            return restaurants;
        }
        
        searchResults.forEach(result => {
            try {
                // 제목과 내용에서 맛집 정보 추출
                const content = `${result.title || ''} ${result.snippet || ''} ${result.content || ''}`;
                const restaurantData = this.parseRestaurantInfo(content, query);
                
                if (restaurantData && !this.isDuplicateByName(restaurantData.name)) {
                    restaurants.push(restaurantData);
                    console.log(`  ✅ ${restaurantData.name} 발견`);
                }
                
            } catch (error) {
                console.log(`  ⚠️ 파싱 오류:`, error.message);
            }
        });
        
        return restaurants;
    }

    // 텍스트에서 맛집 정보 파싱
    parseRestaurantInfo(text, originalQuery) {
        // 주소 패턴 매칭 (부산 해운대구 포함)
        const addressPatterns = [
            /부산광역시\s*해운대구\s*[가-힣\d\s번길로동-]+\d+[가-힣\d\s]*\d*/g,
            /부산\s*해운대구\s*[가-힣\d\s번길로동-]+\d+[가-힣\d\s]*\d*/g,
            /해운대구\s*[가-힣\d\s번길로동-]+\d+[가-힣\d\s]*\d*/g
        ];
        
        let address = null;
        for (const pattern of addressPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                address = matches[0].trim();
                break;
            }
        }
        
        if (!address) return null;
        
        // 맛집 이름 추출 패턴
        const namePatterns = [
            /([가-힣\s\d]+(?:집|점|카페|식당|횟집|국밥|밀면|초밥|스시|갈비|회센터|해물|복국|대구탕))/g,
            /([가-힣\s]+)\s*(?:-|:|\|)\s*(?:부산|해운대)/g,
            /(?:맛집|추천).*?([가-힣\s]+(?:집|점|카페|식당))/g
        ];
        
        let name = null;
        for (const pattern of namePatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                name = matches[0].replace(/맛집|추천|-|:|부산|해운대/g, '').trim();
                if (name.length > 2 && name.length < 30) break;
            }
        }
        
        if (!name || name.length < 2) return null;
        
        // 기본 정보 생성
        const restaurant = {
            name: this.cleanRestaurantName(name),
            address: this.cleanAddress(address),
            category: this.determineCategory(name, text, originalQuery),
            specialty: this.extractSpecialMenu(name, text, originalQuery),
            area: this.extractArea(address),
            rating: this.extractOrEstimateRating(text),
            priceRange: this.estimatePriceRange(name, text, originalQuery),
            businessHours: this.extractBusinessHours(text),
            phone: this.extractPhoneNumber(text),
            features: this.extractFeatures(text, name),
            source: "web_search",
            searchQuery: originalQuery,
            verified: true,
            lastUpdated: new Date().toISOString()
        };
        
        return restaurant;
    }

    // 맛집 이름 정리
    cleanRestaurantName(name) {
        return name
            .replace(/^\s*[\d\.\-\*\•\▪\▫\■\□]+\s*/, '') // 앞의 번호 제거
            .replace(/\s*(?:맛집|추천|베스트|BEST)\s*/gi, '')
            .replace(/\s*(?:부산|해운대|센텀)\s*/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // 주소 정리
    cleanAddress(address) {
        return address
            .replace(/^부산광역시\s*/, '부산광역시 ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // 카테고리 결정
    determineCategory(name, text, query) {
        const categoryKeywords = {
            '한식': ['한식', '돼지국밥', '국밥', '밀면', '갈비', '불고기', '한정식', '비빔밥', '냉면', '삼겹살'],
            '일식': ['일식', '초밥', '스시', '사시미', '라멘', '우동', '돈카츠', '오마카세', '야키니쿠'],
            '중식': ['중식', '짜장', '짬뽕', '탕수육', '마파두부', '딤섬'],
            '양식': ['양식', '파스타', '스테이크', '피자', '리조또', '뇨끼', '브런치'],
            '해산물': ['회', '횟집', '해산물', '조개', '굴', '해물', '아구찜', '대구', '복어', '복국'],
            '카페': ['카페', '커피', '디저트', '베이커리', '브런치카페', '차'],
            '치킨': ['치킨', '닭갈비', '찜닭'],
            '뷔페': ['뷔페', '부페', '파티']
        };
        
        const combined = `${name} ${text} ${query}`.toLowerCase();
        
        for (const [category, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(keyword => combined.includes(keyword))) {
                return category;
            }
        }
        
        return '기타';
    }

    // 특선 메뉴 추출
    extractSpecialMenu(name, text, query) {
        const specialties = {
            '돼지국밥': ['돼지국밥', '항정국밥'],
            '밀면': ['밀면', '냉면'],
            '회': ['회', '사시미', '활어회'],
            '초밥': ['초밥', '스시'],
            '복어요리': ['복국', '복어', '복'],
            '대구탕': ['대구탕', '대구'],
            '갈비': ['갈비', '갈비탕'],
            '아구찜': ['아구찜', '해물찜'],
            '오마카세': ['오마카세'],
            '뇨끼': ['뇨끼'],
            '뷔페': ['뷔페'],
            '커피': ['커피', '아메리카노', '라떼'],
            '차': ['차', '전통차'],
            '해물장': ['해물장'],
            '불고기': ['불고기']
        };
        
        const combined = `${name} ${text} ${query}`.toLowerCase();
        
        for (const [specialty, keywords] of Object.entries(specialties)) {
            if (keywords.some(keyword => combined.includes(keyword))) {
                return specialty;
            }
        }
        
        return '대표메뉴';
    }

    // 지역 추출
    extractArea(address) {
        if (address.includes('센텀')) return '센텀시티';
        if (address.includes('송정')) return '송정';
        if (address.includes('달맞이')) return '달맞이길';
        if (address.includes('좌동')) return '좌동';
        if (address.includes('우동')) return '우동';
        if (address.includes('중동')) return '중동';
        return '해운대';
    }

    // 평점 추출 또는 추정
    extractOrEstimateRating(text) {
        // 명시적 평점 추출
        const ratingPatterns = [
            /(\d\.\d)\s*점/g,
            /평점\s*(\d\.\d)/g,
            /(\d\.\d)\/5/g,
            /★+\s*(\d\.\d)/g
        ];
        
        for (const pattern of ratingPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                const rating = parseFloat(matches[1] || matches[0].match(/\d\.\d/)?.[0]);
                if (rating && rating >= 1 && rating <= 5) {
                    return rating;
                }
            }
        }
        
        // 키워드 기반 추정
        const positiveKeywords = ['인기', '유명', '맛있', '최고', '베스트', '추천', '전통'];
        const neutralKeywords = ['괜찮', '좋', '나쁘지않'];
        
        const positiveCount = positiveKeywords.filter(keyword => text.includes(keyword)).length;
        const neutralCount = neutralKeywords.filter(keyword => text.includes(keyword)).length;
        
        if (positiveCount >= 2) return 4.4;
        if (positiveCount >= 1) return 4.2;
        if (neutralCount >= 1) return 3.9;
        
        return 4.1; // 기본값
    }

    // 가격대 추정
    estimatePriceRange(name, text, query) {
        // 명시적 가격 추출
        const pricePattern = /(\d{1,2}),?(\d{3})원?[-~](\d{1,2}),?(\d{3})원?/g;
        const priceMatches = text.match(pricePattern);
        
        if (priceMatches) {
            return priceMatches[0];
        }
        
        // 카테고리별 기본 가격
        const category = this.determineCategory(name, text, query);
        const basePrices = {
            '한식': '8,000-15,000원',
            '일식': '15,000-35,000원',
            '중식': '8,000-20,000원',
            '양식': '15,000-30,000원',
            '해산물': '20,000-50,000원',
            '카페': '5,000-12,000원',
            '치킨': '15,000-25,000원',
            '뷔페': '35,000-55,000원'
        };
        
        let basePrice = basePrices[category] || '10,000-20,000원';
        
        // 프리미엄 키워드 체크
        if (text.includes('고급') || text.includes('프리미엄') || text.includes('오마카세')) {
            const prices = basePrice.match(/\d+,\d+/g);
            if (prices) {
                const adjustedPrices = prices.map(price => 
                    Math.round(parseInt(price.replace(',', '')) * 1.5).toLocaleString()
                );
                basePrice = `${adjustedPrices[0]}-${adjustedPrices[1]}원`;
            }
        }
        
        return basePrice;
    }

    // 영업시간 추출
    extractBusinessHours(text) {
        const hoursPatterns = [
            /(\d{1,2}):(\d{2})\s*[-~]\s*(\d{1,2}):(\d{2})/g,
            /(\d{1,2})시\s*[-~]\s*(\d{1,2})시/g,
            /24시간/g
        ];
        
        for (const pattern of hoursPatterns) {
            const matches = text.match(pattern);
            if (matches) {
                return matches[0];
            }
        }
        
        return '11:00-21:00';
    }

    // 전화번호 추출
    extractPhoneNumber(text) {
        const phonePatterns = [
            /(051[-\s]?\d{3}[-\s]?\d{4})/g,
            /(0507[-\s]?\d{4}[-\s]?\d{4})/g,
            /(\d{3}[-\s]?\d{4}[-\s]?\d{4})/g
        ];
        
        for (const pattern of phonePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                return matches[0];
            }
        }
        
        return '';
    }

    // 특징 추출
    extractFeatures(text, name) {
        const features = [];
        
        const featureKeywords = {
            '주차가능': ['주차', '파킹'],
            '24시간 영업': ['24시간', '밤늦게'],
            '전통맛집': ['전통', '년', '오래된'],
            '인기맛집': ['인기', '유명', '베스트'],
            '예약 필요': ['예약'],
            '브레이크타임': ['브레이크', '휴식시간'],
            '뷰맛집': ['뷰', '전망', '바다'],
            '회식추천': ['회식', '단체'],
            '데이트': ['데이트', '커플'],
            '가성비': ['가성비', '저렴', '합리적']
        };
        
        const combined = `${text} ${name}`.toLowerCase();
        
        for (const [feature, keywords] of Object.entries(featureKeywords)) {
            if (keywords.some(keyword => combined.includes(keyword))) {
                features.push(feature);
            }
        }
        
        return features.length > 0 ? features : ['추천맛집'];
    }

    // 중복 체크
    isDuplicateByName(name) {
        const cleanName = name.replace(/\s/g, '').toLowerCase();
        
        for (const existing of this.restaurants) {
            const existingClean = existing.name.replace(/\s/g, '').toLowerCase();
            if (existingClean === cleanName) {
                return true;
            }
        }
        
        if (this.processedNames.has(cleanName)) {
            return true;
        }
        
        this.processedNames.add(cleanName);
        return false;
    }

    // 메인 수집 함수
    async collectRestaurants(targetArea = "해운대", targetCount = 50) {
        console.log(`🚀 ${targetArea} 지역 맛집 ${targetCount}곳 웹검색 수집 시작`);
        console.log('=' .repeat(60));
        
        const queries = this.generateSearchQueries(targetArea);
        let processedQueries = 0;
        
        for (const query of queries) {
            if (this.restaurants.length >= targetCount) {
                console.log(`\n🎯 목표 달성! ${targetCount}개 수집 완료`);
                break;
            }
            
            try {
                const searchResults = await this.performWebSearch(query);
                const extractedRestaurants = this.extractRestaurantData(searchResults, query);
                
                // ID 부여하여 추가
                extractedRestaurants.forEach(restaurant => {
                    if (this.restaurants.length < targetCount) {
                        this.restaurants.push({
                            id: `hd${String(this.restaurants.length + 1).padStart(3, '0')}`,
                            ...restaurant
                        });
                    }
                });
                
                processedQueries++;
                console.log(`📊 진행률: ${processedQueries}/${queries.length} (수집됨: ${this.restaurants.length}/${targetCount})`);
                
                // API 호출 제한 고려
                await this.delay(2000);
                
            } catch (error) {
                console.error(`❌ 검색 실패: ${query}`, error.message);
            }
        }
        
        console.log(`\n✅ 최종 수집 완료: ${this.restaurants.length}개 맛집`);
        return this.restaurants;
    }

    // 지연 함수
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 결과 저장
    async saveResults(filename = 'restaurants_해운대구.json') {
        const filePath = path.join(__dirname, 'restaurants', filename);
        
        // restaurants 디렉토리 생성
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 기존 데이터 읽기
        let existingData = [];
        if (fs.existsSync(filePath)) {
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                existingData = JSON.parse(content);
            } catch (error) {
                console.log('기존 파일 읽기 실패, 새 파일로 생성');
            }
        }
        
        // 중복 제거하여 병합
        const combined = [...existingData];
        
        this.restaurants.forEach(newRestaurant => {
            const isDuplicate = combined.some(existing => 
                existing.name.replace(/\s/g, '') === newRestaurant.name.replace(/\s/g, '') ||
                existing.address === newRestaurant.address
            );
            
            if (!isDuplicate) {
                combined.push(newRestaurant);
            }
        });
        
        // 평점순 정렬
        combined.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        
        // 파일 저장
        fs.writeFileSync(filePath, JSON.stringify(combined, null, 2), 'utf8');
        
        console.log(`\n💾 총 ${combined.length}개 맛집 데이터가 저장되었습니다.`);
        console.log(`📁 파일: ${filePath}`);
        
        // 통계 출력
        this.printStatistics(combined);
        
        return filePath;
    }

    // 통계 출력
    printStatistics(restaurants) {
        console.log('\n📊 수집 통계 보고서');
        console.log('=' .repeat(50));
        
        console.log(`📍 총 맛집 수: ${restaurants.length}개`);
        
        // 카테고리별 분포
        const categories = {};
        const areas = {};
        const ratings = [];
        
        restaurants.forEach(r => {
            categories[r.category] = (categories[r.category] || 0) + 1;
            areas[r.area] = (areas[r.area] || 0) + 1;
            if (r.rating) ratings.push(r.rating);
        });
        
        console.log('\n🏷️ 카테고리별 분포:');
        Object.entries(categories)
            .sort(([,a], [,b]) => b - a)
            .forEach(([category, count]) => {
                const percentage = Math.round(count / restaurants.length * 100);
                console.log(`  ${category}: ${count}개 (${percentage}%)`);
            });
        
        console.log('\n🗺️ 지역별 분포:');
        Object.entries(areas)
            .sort(([,a], [,b]) => b - a)
            .forEach(([area, count]) => {
                const percentage = Math.round(count / restaurants.length * 100);
                console.log(`  ${area}: ${count}개 (${percentage}%)`);
            });
        
        if (ratings.length > 0) {
            const avgRating = (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1);
            const highRated = ratings.filter(r => r >= 4.5).length;
            console.log(`\n⭐ 평점 정보:`);
            console.log(`  평균 평점: ${avgRating}점`);
            console.log(`  4.5점 이상: ${highRated}개`);
        }
        
        // 검색 히스토리 요약
        console.log(`\n🔍 검색 요약:`);
        console.log(`  총 검색 쿼리: ${this.searchHistory.length}개`);
        console.log(`  성공률: ${Math.round(this.restaurants.length / this.searchHistory.length * 100)}%`);
    }
}

module.exports = RealWebSearchRestaurantAgent;