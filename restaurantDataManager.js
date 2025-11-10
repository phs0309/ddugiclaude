const fs = require('fs').promises;
const path = require('path');
const schedule = require('node-schedule');

/**
 * 부산 맛집 데이터 관리 에이전트
 * 각 구역별 맛집 정보를 찾고 매일 업데이트하는 시스템
 */
class RestaurantDataManager {
    constructor() {
        // 부산 16개 시군구
        this.districts = [
            '중구', '서구', '동구', '영도구', '부산진구', '동래구', 
            '남구', '북구', '해운대구', '사하구', '금정구', '강서구', 
            '연제구', '수영구', '사상구', '기장군'
        ];
        
        // 업데이트 로그
        this.updateLog = [];
        
        // 데이터 소스 설정
        this.dataSources = {
            // 네이버 블로그, 카카오맵, 망고플레이트 등의 데이터 소스
            naver: 'https://search.naver.com/search.naver',
            kakao: 'https://map.kakao.com',
            mangoplate: 'https://www.mangoplate.com'
        };
    }

    /**
     * 모든 구역의 맛집 데이터 초기화 및 업데이트
     */
    async initializeAllDistricts() {
        console.log('🚀 부산 맛집 데이터 관리 에이전트 시작');
        
        for (const district of this.districts) {
            try {
                await this.updateDistrictData(district);
                console.log(`✅ ${district} 데이터 업데이트 완료`);
            } catch (error) {
                console.error(`❌ ${district} 데이터 업데이트 실패:`, error.message);
                this.logError(district, error);
            }
        }
    }

    /**
     * 특정 구역의 맛집 데이터 업데이트
     */
    async updateDistrictData(district) {
        const fileName = `restaurants_${district}.json`;
        const filePath = path.join(__dirname, 'restaurants', fileName);
        
        try {
            // 기존 데이터 읽기
            let existingData = [];
            try {
                const fileContent = await fs.readFile(filePath, 'utf8');
                existingData = JSON.parse(fileContent);
            } catch (error) {
                console.log(`📝 ${district} 새 파일 생성`);
            }

            // 새로운 맛집 데이터 수집
            const newRestaurants = await this.fetchRestaurantData(district);
            
            // 데이터 병합 및 중복 제거
            const updatedData = this.mergeRestaurantData(existingData, newRestaurants);
            
            // 파일 저장
            await fs.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
            
            // 로그 기록
            this.logUpdate(district, updatedData.length, newRestaurants.length);
            
            return updatedData;
        } catch (error) {
            throw new Error(`${district} 데이터 업데이트 실패: ${error.message}`);
        }
    }

    /**
     * 구역별 키워드 반환
     */
    getDistrictKeywords(district) {
        const keywordMap = {
            '해운대구': ['돼지국밥', '회', '밀면', '카페', '해산물'],
            '중구': ['씨앗호떡', '어묵', '국밥', '회'],
            '서구': ['꼼장어', '아구찜', '밀면'],
            '부산진구': ['밀면', '돼지국밥', '냉면'],
            '수영구': ['회', '조개구이', '카페'],
            '동래구': ['파전', '온천', '한정식']
        };
        
        return keywordMap[district] || ['맛집', '한식', '카페'];
    }
    
    /**
     * 이름으로 중복 제거
     */
    removeDuplicatesByName(restaurants) {
        const seen = new Set();
        return restaurants.filter(restaurant => {
            const name = restaurant.name?.toLowerCase() || '';
            if (seen.has(name)) {
                return false;
            }
            seen.add(name);
            return true;
        });
    }
    
    /**
     * 대기 함수
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 업데이트 리포트 생성
     */
    async generateUpdateReport(districts) {
        console.log('\n📊 업데이트 리포트:');
        for (const district of districts) {
            try {
                const filePath = path.join(__dirname, 'restaurants', `restaurants_${district}.json`);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                console.log(`  • ${district}: ${data.length}개 맛집`);
            } catch (error) {
                console.log(`  • ${district}: 데이터 없음`);
            }
        }
    }

    /**
     * 맛집 데이터 수집 (실제 웹 스크래핑)
     */
    async fetchRestaurantData(district) {
        console.log(`🔍 ${district} 실제 맛집 정보 웹 스크래핑 중...`);
        
        // WebScraper 사용하여 실제 데이터 수집
        const WebScraper = require('./webScraper.js');
        const scraper = new WebScraper();
        
        const keywords = this.getDistrictKeywords(district);
        let allRestaurants = [];
        
        // 10개만 수집하도록 제한
        let totalCollected = 0;
        const targetCount = 10;
        
        for (const keyword of keywords) {
            if (totalCollected >= targetCount) break;
            
            try {
                const remainingCount = targetCount - totalCollected;
                const collectCount = Math.min(2, remainingCount); // 키워드당 최대 2개
                
                console.log(`  📝 키워드 "${keyword}"로 ${district} 검색 중 (${collectCount}개)...`);
                const restaurants = await scraper.scrapeMultipleSites(district, keyword, collectCount);
                
                if (restaurants && restaurants.length > 0) {
                    allRestaurants.push(...restaurants);
                    totalCollected += restaurants.length;
                    console.log(`  ✅ "${keyword}": ${restaurants.length}개 맛집 수집`);
                } else {
                    console.log(`  ❌ "${keyword}": 수집된 맛집 없음`);
                }
                
                // 서버 부하 방지
                await this.sleep(1000);
                
            } catch (error) {
                console.error(`  ❌ "${keyword}" 수집 실패:`, error.message);
            }
        }
        
        // 중복 제거
        const uniqueRestaurants = this.removeDuplicatesByName(allRestaurants);
        
        // 데이터 검증
        const validatedData = this.validateRestaurantData(uniqueRestaurants);
        
        // 최대 10개로 제한
        const limitedData = validatedData.slice(0, 10);
        
        console.log(`✅ ${district} 총 ${limitedData.length}개 실제 맛집 수집 완료`);
        return limitedData;
    }

    /**
     * 모의 데이터 생성 (실제로는 웹 스크래핑으로 대체)
     */
    async generateMockData(district) {
        // 각 구역별 특색있는 맛집 카테고리
        const districtCategories = {
            '해운대구': ['해산물', '회', '카페', '양식'],
            '서면': ['밀면', '돼지국밥', '한식', '술집'],
            '남포동': ['씨앗호떡', '국제시장 먹거리', '분식'],
            '광안리': ['회', '해산물', '치킨', '카페'],
            '기장군': ['멸치', '해산물', '전통음식'],
            // ... 다른 구역들
        };

        const categories = districtCategories[district] || ['한식', '중식', '일식', '카페'];
        const restaurants = [];

        for (let i = 0; i < Math.floor(Math.random() * 5) + 3; i++) {
            const restaurant = {
                id: `${district}_${Date.now()}_${i}`,
                name: `${district} 맛집 ${i + 1}`,
                area: district,
                category: categories[Math.floor(Math.random() * categories.length)],
                description: `${district}의 대표적인 맛집입니다.`,
                specialties: [categories[0], categories[1] || '현지음식'],
                rating: (Math.random() * 2 + 3).toFixed(1),
                priceRange: ['저렴', '보통', '고급'][Math.floor(Math.random() * 3)],
                address: `부산광역시 ${district}`,
                phone: `051-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
                lastUpdated: new Date().toISOString(),
                dataSource: 'web_scraping',
                verified: true
            };
            restaurants.push(restaurant);
        }

        return restaurants;
    }

    /**
     * 맛집 데이터 검증
     */
    validateRestaurantData(restaurants) {
        return restaurants.filter(restaurant => {
            return restaurant.name && 
                   restaurant.area && 
                   restaurant.category && 
                   restaurant.description &&
                   restaurant.rating >= 0 &&
                   restaurant.rating <= 5;
        });
    }

    /**
     * 기존 데이터와 새 데이터 병합
     */
    mergeRestaurantData(existingData, newData) {
        const merged = [...existingData];
        
        newData.forEach(newRestaurant => {
            // 중복 체크 (이름과 주소 기준)
            const exists = merged.find(existing => 
                existing.name === newRestaurant.name && 
                existing.address === newRestaurant.address
            );
            
            if (!exists) {
                merged.push(newRestaurant);
            } else {
                // 기존 데이터 업데이트
                Object.assign(exists, { 
                    ...newRestaurant, 
                    lastUpdated: new Date().toISOString() 
                });
            }
        });
        
        return merged;
    }

    /**
     * 매일 자동 업데이트 스케줄러 시작
     */
    startDailyScheduler() {
        console.log('⏰ 매일 자동 업데이트 스케줄러 시작 (매일 오전 6시)');
        
        // 매일 오전 6시에 실행
        schedule.scheduleJob('0 6 * * *', async () => {
            console.log('🔄 일일 자동 업데이트 시작:', new Date().toLocaleString());
            await this.initializeAllDistricts();
            await this.generateDailyReport();
        });

        // 매주 일요일 오전 3시에 데이터 정리
        schedule.scheduleJob('0 3 * * 0', async () => {
            console.log('🧹 주간 데이터 정리 시작:', new Date().toLocaleString());
            await this.cleanupOldData();
        });
    }

    /**
     * 수동 업데이트 실행
     */
    async runManualUpdate(districts = null) {
        const targetDistricts = districts || this.districts;
        
        console.log(`🔄 수동 업데이트 시작: ${targetDistricts.join(', ')}`);
        
        for (const district of targetDistricts) {
            try {
                await this.updateDistrictData(district);
            } catch (error) {
                console.error(`❌ ${district} 업데이트 실패:`, error.message);
            }
        }
        
        await this.generateUpdateReport(targetDistricts);
    }

    /**
     * 일일 리포트 생성
     */
    async generateDailyReport() {
        const report = {
            date: new Date().toISOString().split('T')[0],
            districts: this.districts.length,
            totalRestaurants: 0,
            newRestaurants: 0,
            updatedRestaurants: 0,
            errors: this.updateLog.filter(log => log.type === 'error').length
        };

        // 각 구역별 통계
        for (const district of this.districts) {
            try {
                const filePath = path.join(__dirname, `restaurants_${district}.json`);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                report.totalRestaurants += data.length;
                
                const todayUpdated = data.filter(r => 
                    r.lastUpdated && r.lastUpdated.startsWith(report.date)
                );
                report.updatedRestaurants += todayUpdated.length;
            } catch (error) {
                console.error(`리포트 생성 중 ${district} 오류:`, error.message);
            }
        }

        // 리포트 저장
        const reportPath = path.join(__dirname, 'reports', `daily_report_${report.date}.json`);
        await this.ensureDirectoryExists(path.dirname(reportPath));
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        console.log('📊 일일 리포트 생성 완료:', report);
        return report;
    }

    /**
     * 오래된 데이터 정리
     */
    async cleanupOldData() {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 30); // 30일 이전 데이터

        for (const district of this.districts) {
            try {
                const filePath = path.join(__dirname, `restaurants_${district}.json`);
                const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
                
                const cleanedData = data.filter(restaurant => {
                    if (!restaurant.lastUpdated) return true;
                    return new Date(restaurant.lastUpdated) > cutoffDate;
                });

                if (cleanedData.length !== data.length) {
                    await fs.writeFile(filePath, JSON.stringify(cleanedData, null, 2));
                    console.log(`🧹 ${district}: ${data.length - cleanedData.length}개 오래된 데이터 정리`);
                }
            } catch (error) {
                console.error(`${district} 데이터 정리 실패:`, error.message);
            }
        }
    }

    /**
     * 로깅 함수들
     */
    logUpdate(district, totalCount, newCount) {
        const log = {
            type: 'update',
            district,
            timestamp: new Date().toISOString(),
            totalRestaurants: totalCount,
            newRestaurants: newCount
        };
        this.updateLog.push(log);
    }

    logError(district, error) {
        const log = {
            type: 'error',
            district,
            timestamp: new Date().toISOString(),
            error: error.message
        };
        this.updateLog.push(log);
    }

    /**
     * 디렉토리 존재 확인 및 생성
     */
    async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * 특정 구역 데이터 조회
     */
    async getDistrictData(district) {
        try {
            const filePath = path.join(__dirname, `restaurants_${district}.json`);
            const data = await fs.readFile(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`${district} 데이터 조회 실패:`, error.message);
            return [];
        }
    }

    /**
     * 모든 구역 데이터 통계
     */
    async getOverallStats() {
        const stats = {
            districts: this.districts.length,
            totalRestaurants: 0,
            byDistrict: {},
            byCategory: {},
            lastUpdate: null
        };

        for (const district of this.districts) {
            const data = await this.getDistrictData(district);
            stats.totalRestaurants += data.length;
            stats.byDistrict[district] = data.length;

            // 카테고리별 통계
            data.forEach(restaurant => {
                if (restaurant.category) {
                    stats.byCategory[restaurant.category] = 
                        (stats.byCategory[restaurant.category] || 0) + 1;
                }
            });
        }

        return stats;
    }
}

// 에이전트 인스턴스 생성 및 실행
const agent = new RestaurantDataManager();

// CLI 명령어 처리
if (require.main === module) {
    const command = process.argv[2];
    const district = process.argv[3];

    switch (command) {
        case 'init':
            console.log('🚀 전체 구역 초기화 시작...');
            agent.initializeAllDistricts();
            break;
            
        case 'update':
            if (district) {
                console.log(`🔄 ${district} 업데이트 시작...`);
                agent.runManualUpdate([district]);
            } else {
                console.log('🔄 전체 구역 업데이트 시작...');
                agent.runManualUpdate();
            }
            break;
            
        case 'schedule':
            console.log('⏰ 스케줄러 시작...');
            agent.startDailyScheduler();
            break;
            
        case 'stats':
            agent.getOverallStats().then(stats => {
                console.log('📊 전체 통계:', JSON.stringify(stats, null, 2));
            });
            break;
            
        case 'report':
            agent.generateDailyReport();
            break;
            
        default:
            console.log(`
🍴 부산 맛집 데이터 관리 에이전트

사용법:
  node restaurantDataManager.js init              # 전체 구역 초기화
  node restaurantDataManager.js update [구역명]   # 데이터 업데이트
  node restaurantDataManager.js schedule         # 스케줄러 시작
  node restaurantDataManager.js stats            # 전체 통계 조회
  node restaurantDataManager.js report           # 일일 리포트 생성

예시:
  node restaurantDataManager.js update 해운대구
  node restaurantDataManager.js init
            `);
    }
}

module.exports = RestaurantDataManager;