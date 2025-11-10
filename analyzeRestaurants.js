const fs = require('fs');
const path = require('path');

class RestaurantDataAnalyzer {
    constructor() {
        this.duplicates = [];
        this.corrupted = [];
        this.clean = [];
    }

    analyzeData(filePath) {
        console.log('🔍 분석 시작: 해운대구 맛집 데이터');
        console.log('=' .repeat(60));
        
        // 데이터 읽기
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`📊 총 데이터 수: ${data.length}개`);
        
        // 중복 및 손상 데이터 분석
        this.findDuplicates(data);
        this.findCorruptedEntries(data);
        this.findCleanEntries(data);
        
        console.log('\n📈 분석 결과:');
        console.log(`  중복 데이터: ${this.duplicates.length}개`);
        console.log(`  손상 데이터: ${this.corrupted.length}개`);
        console.log(`  정상 데이터: ${this.clean.length}개`);
        
        return {
            duplicates: this.duplicates,
            corrupted: this.corrupted,
            clean: this.clean
        };
    }

    findDuplicates(data) {
        const seen = new Map();
        const seenAddresses = new Map();
        
        data.forEach((restaurant, index) => {
            const name = restaurant.name?.replace(/\s/g, '').toLowerCase();
            const address = restaurant.address?.trim();
            
            // 이름 기반 중복 체크
            if (seen.has(name)) {
                this.duplicates.push({
                    type: 'name_duplicate',
                    index,
                    restaurant,
                    originalIndex: seen.get(name),
                    reason: `이름 중복: "${restaurant.name}"`
                });
            } else {
                seen.set(name, index);
            }
            
            // 주소 기반 중복 체크
            if (address && seenAddresses.has(address)) {
                this.duplicates.push({
                    type: 'address_duplicate',
                    index,
                    restaurant,
                    originalIndex: seenAddresses.get(address),
                    reason: `주소 중복: "${address}"`
                });
            } else if (address) {
                seenAddresses.set(address, index);
            }
        });
    }

    findCorruptedEntries(data) {
        data.forEach((restaurant, index) => {
            const issues = [];
            
            // 이름 검사
            if (!restaurant.name) {
                issues.push('이름 누락');
            } else if (restaurant.name.length < 2) {
                issues.push('이름 너무 짧음');
            } else if (restaurant.name.includes('광역시') || restaurant.name.includes('구') || restaurant.name.includes('번길')) {
                issues.push('이름에 주소 혼입');
            } else if (/^\d+/.test(restaurant.name)) {
                issues.push('이름이 숫자로 시작');
            }
            
            // 주소 검사
            if (!restaurant.address) {
                issues.push('주소 누락');
            } else if (!restaurant.address.includes('부산') && !restaurant.address.includes('해운대구')) {
                issues.push('올바르지 않은 주소 형식');
            } else if (restaurant.address.includes('전문') || restaurant.address.includes('추천') || restaurant.address.includes('맛집')) {
                issues.push('주소에 설명 혼입');
            }
            
            // 가격 검사
            if (restaurant.priceRange && !/\d+[,-]\d+원?/.test(restaurant.priceRange)) {
                issues.push('올바르지 않은 가격 형식');
            }
            
            // ID 중복 검사
            const idCount = data.filter(r => r.id === restaurant.id).length;
            if (idCount > 1) {
                issues.push('ID 중복');
            }
            
            if (issues.length > 0) {
                this.corrupted.push({
                    index,
                    restaurant,
                    issues,
                    reason: issues.join(', ')
                });
            }
        });
    }

    findCleanEntries(data) {
        const duplicateIndices = new Set(this.duplicates.map(d => d.index));
        const corruptedIndices = new Set(this.corrupted.map(c => c.index));
        
        data.forEach((restaurant, index) => {
            if (!duplicateIndices.has(index) && !corruptedIndices.has(index)) {
                this.clean.push({
                    index,
                    restaurant
                });
            }
        });
    }

    generateCleanedData() {
        console.log('\n🧹 데이터 정리 중...');
        
        // 정상 데이터부터 시작
        let cleaned = this.clean.map(item => item.restaurant);
        
        // 중복 데이터에서 최고 품질 선택
        const duplicateGroups = this.groupDuplicates();
        duplicateGroups.forEach(group => {
            const best = this.selectBestFromGroup(group);
            if (best) {
                cleaned.push(best);
            }
        });
        
        // ID 재할당
        cleaned = this.reassignIds(cleaned);
        
        console.log(`✅ 정리 완료: ${cleaned.length}개 맛집`);
        return cleaned;
    }

    groupDuplicates() {
        const groups = new Map();
        
        this.duplicates.forEach(duplicate => {
            const key = duplicate.restaurant.name?.replace(/\s/g, '').toLowerCase() || 
                       duplicate.restaurant.address?.trim();
            
            if (!groups.has(key)) {
                groups.set(key, []);
            }
            groups.get(key).push(duplicate.restaurant);
        });
        
        return Array.from(groups.values());
    }

    selectBestFromGroup(group) {
        if (group.length === 0) return null;
        if (group.length === 1) return group[0];
        
        // 품질 점수 계산
        return group.reduce((best, current) => {
            const currentScore = this.calculateQualityScore(current);
            const bestScore = this.calculateQualityScore(best);
            
            return currentScore > bestScore ? current : best;
        });
    }

    calculateQualityScore(restaurant) {
        let score = 0;
        
        // 이름 품질
        if (restaurant.name && restaurant.name.length > 2 && restaurant.name.length < 30) {
            score += 10;
        }
        
        // 주소 품질
        if (restaurant.address && restaurant.address.includes('부산광역시') && 
            restaurant.address.includes('해운대구') && !restaurant.address.includes('전문')) {
            score += 15;
        }
        
        // 연락처
        if (restaurant.phone && restaurant.phone.length > 5) {
            score += 5;
        }
        
        // 평점
        if (restaurant.rating && restaurant.rating >= 3) {
            score += 10;
        }
        
        // 특징
        if (restaurant.features && restaurant.features.length > 0) {
            score += 5;
        }
        
        // 가격 정보
        if (restaurant.priceRange && /\d+[,-]\d+원?/.test(restaurant.priceRange)) {
            score += 5;
        }
        
        // 검증 상태
        if (restaurant.source === 'web_verified') {
            score += 10;
        }
        
        return score;
    }

    reassignIds(restaurants) {
        return restaurants.map((restaurant, index) => ({
            ...restaurant,
            id: `hd${String(index + 1).padStart(3, '0')}`
        }));
    }

    printDetailedReport() {
        console.log('\n📋 상세 분석 보고서');
        console.log('=' .repeat(60));
        
        if (this.duplicates.length > 0) {
            console.log('\n🔄 중복 데이터:');
            this.duplicates.forEach((dup, i) => {
                console.log(`  ${i+1}. [${dup.index}] ${dup.restaurant.name} - ${dup.reason}`);
            });
        }
        
        if (this.corrupted.length > 0) {
            console.log('\n❌ 손상 데이터:');
            this.corrupted.forEach((cor, i) => {
                console.log(`  ${i+1}. [${cor.index}] ${cor.restaurant.name} - ${cor.reason}`);
            });
        }
        
        console.log('\n✅ 정상 데이터:');
        console.log(`  총 ${this.clean.length}개의 정상 데이터 확인됨`);
    }
}

// 실행
const analyzer = new RestaurantDataAnalyzer();
const filePath = path.join(__dirname, 'restaurants', 'restaurants_해운대구.json');

try {
    const analysis = analyzer.analyzeData(filePath);
    analyzer.printDetailedReport();
    
    const cleanedData = analyzer.generateCleanedData();
    
    // 정리된 데이터 미리보기
    console.log('\n🎯 정리된 데이터 미리보기 (상위 5개):');
    cleanedData.slice(0, 5).forEach((restaurant, i) => {
        console.log(`  ${i+1}. ${restaurant.name} (${restaurant.area}) - ${restaurant.rating}점`);
    });
    
    // 정리된 데이터 임시 저장
    const cleanedPath = path.join(__dirname, 'restaurants', 'restaurants_해운대구_cleaned.json');
    fs.writeFileSync(cleanedPath, JSON.stringify(cleanedData, null, 2), 'utf8');
    console.log(`\n💾 정리된 데이터 저장됨: ${cleanedPath}`);
    console.log(`📊 정리 결과: ${cleanedData.length}개 맛집 (목표: 100개, 추가 필요: ${100 - cleanedData.length}개)`);
    
} catch (error) {
    console.error('❌ 분석 오류:', error.message);
}