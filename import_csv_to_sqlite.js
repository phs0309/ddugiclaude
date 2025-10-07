/**
 * CSV 파일을 SQLite 데이터베이스로 변환
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

class CSVImporter {
    constructor() {
        this.dbPath = path.join(__dirname, 'restaurants.db');
        this.db = new sqlite3.Database(this.dbPath);
        this.importedCount = 0;
        this.errorCount = 0;
    }

    // CSV 파일을 SQLite로 가져오기
    async importCSV(csvFilePath) {
        return new Promise((resolve, reject) => {
            console.log(`📥 CSV 파일 가져오기 시작: ${csvFilePath}`);
            
            // Prepared Statement 생성
            const insertSQL = `
                INSERT INTO restaurants (
                    name, category, area, address, road_address, phone,
                    rating, review_count, price_range, specialties, description,
                    latitude, longitude, franchise, google_place_id, google_rating,
                    google_reviews, opening_hours, website
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const stmt = this.db.prepare(insertSQL);
            
            // 트랜잭션 시작 (성능 향상)
            this.db.run("BEGIN TRANSACTION");
            
            const results = [];
            
            fs.createReadStream(csvFilePath, { encoding: 'utf8' })
                .pipe(csv())
                .on('data', (row) => {
                    try {
                        // 데이터 정제 및 변환
                        const cleanRow = this.cleanRowData(row);
                        
                        // 중복 체크 (이름 + 주소 기준)
                        if (!this.isDuplicate(cleanRow, results)) {
                            results.push(cleanRow);
                            
                            // SQLite에 삽입
                            stmt.run([
                                cleanRow.name,
                                cleanRow.category,
                                cleanRow.area,
                                cleanRow.address,
                                cleanRow.road_address,
                                cleanRow.phone,
                                cleanRow.rating,
                                cleanRow.review_count,
                                cleanRow.price_range,
                                cleanRow.specialties,
                                cleanRow.description,
                                cleanRow.latitude,
                                cleanRow.longitude,
                                cleanRow.franchise,
                                cleanRow.google_place_id,
                                cleanRow.google_rating,
                                cleanRow.google_reviews,
                                cleanRow.opening_hours,
                                cleanRow.website
                            ], (err) => {
                                if (err) {
                                    console.error('삽입 오류:', err);
                                    this.errorCount++;
                                } else {
                                    this.importedCount++;
                                    if (this.importedCount % 1000 === 0) {
                                        console.log(`진행 상황: ${this.importedCount}개 처리됨`);
                                    }
                                }
                            });
                        }
                    } catch (error) {
                        console.error('행 처리 오류:', error);
                        this.errorCount++;
                    }
                })
                .on('end', () => {
                    // 트랜잭션 커밋
                    this.db.run("COMMIT", (err) => {
                        if (err) {
                            console.error('커밋 오류:', err);
                            reject(err);
                        } else {
                            stmt.finalize();
                            console.log(`✅ CSV 가져오기 완료!`);
                            console.log(`📊 성공: ${this.importedCount}개, 오류: ${this.errorCount}개`);
                            resolve(this.importedCount);
                        }
                    });
                })
                .on('error', (error) => {
                    console.error('CSV 읽기 오류:', error);
                    this.db.run("ROLLBACK");
                    reject(error);
                });
        });
    }

    // 데이터 정제 함수
    cleanRowData(row) {
        return {
            name: this.cleanString(row['상호명'] || row['name'] || ''),
            category: this.cleanString(row['상권업종소분류명'] || row['category'] || ''),
            area: this.cleanString(row['시군구명'] || row['area'] || ''),
            address: this.cleanString(row['지번주소'] || row['address'] || ''),
            road_address: this.cleanString(row['도로명주소'] || row['road_address'] || ''),
            phone: this.cleanString(row['google_formatted_phone'] || row['phone'] || ''),
            rating: this.parseFloat(row['google_rating'] || row['rating'] || 0),
            review_count: this.parseInt(row['google_user_ratings_total'] || row['review_count'] || 0),
            price_range: this.cleanString(row['price_range'] || ''),
            specialties: this.cleanString(row['specialties'] || ''),
            description: this.cleanString(row['google_reviews'] || row['description'] || ''),
            latitude: this.parseFloat(row['위도'] || row['latitude'] || 0),
            longitude: this.parseFloat(row['경도'] || row['longitude'] || 0),
            franchise: this.parseInt(row['프랜차이즈'] || row['franchise'] || 0),
            google_place_id: this.cleanString(row['google_place_id'] || ''),
            google_rating: this.parseFloat(row['google_rating'] || 0),
            google_reviews: this.cleanString(row['google_reviews'] || ''),
            opening_hours: this.cleanString(row['google_opening_hours'] || row['opening_hours'] || ''),
            website: this.cleanString(row['google_website'] || row['website'] || '')
        };
    }

    // 문자열 정제
    cleanString(str) {
        if (!str || str === 'nan' || str === 'NaN') return '';
        return String(str).trim().replace(/\s+/g, ' ');
    }

    // 숫자 파싱
    parseFloat(value) {
        if (!value || value === 'nan' || value === 'NaN') return 0;
        const parsed = parseFloat(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    parseInt(value) {
        if (!value || value === 'nan' || value === 'NaN') return 0;
        const parsed = parseInt(value);
        return isNaN(parsed) ? 0 : parsed;
    }

    // 중복 검사 (이름 + 주소 기준)
    isDuplicate(newRow, existingRows) {
        return existingRows.some(row => 
            row.name === newRow.name && 
            row.address === newRow.address
        );
    }

    // 여러 CSV 파일 처리
    async importMultipleCSVs(csvFileList) {
        let totalImported = 0;
        
        for (const csvFile of csvFileList) {
            if (fs.existsSync(csvFile)) {
                console.log(`\n📁 처리 중: ${path.basename(csvFile)}`);
                const imported = await this.importCSV(csvFile);
                totalImported += imported;
            } else {
                console.log(`⚠️ 파일을 찾을 수 없음: ${csvFile}`);
            }
        }
        
        return totalImported;
    }

    // 데이터베이스 연결 종료
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('데이터베이스 종료 오류:', err);
            } else {
                console.log('✅ 데이터베이스 연결 종료');
            }
        });
    }
}

// 직접 실행 시
if (require.main === module) {
    async function main() {
        const importer = new CSVImporter();
        
        // 부산 음식점 CSV 파일들
        const csvFiles = [
            '부산_음식점_최종.csv',
            '부산_음식점_구글API_50개샘플.csv',
            '부산_음식점_좌표이름매칭_200m범위_구글좌표포함_50개샘플_성공률14.0프로.csv'
            // 추가 CSV 파일들을 여기에 나열
        ];
        
        try {
            console.log('🗄️ SQLite 데이터베이스에 CSV 데이터 가져오기 시작...');
            const totalImported = await importer.importMultipleCSVs(csvFiles);
            console.log(`\n🎉 모든 CSV 파일 처리 완료! 총 ${totalImported}개 음식점 추가됨`);
        } catch (error) {
            console.error('❌ CSV 가져오기 실패:', error);
        } finally {
            importer.close();
        }
    }
    
    main();
}

module.exports = CSVImporter;