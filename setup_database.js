/**
 * SQLite 데이터베이스 설정 및 테이블 생성
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseSetup {
    constructor() {
        this.dbPath = path.join(__dirname, 'restaurants.db');
        this.db = new sqlite3.Database(this.dbPath);
    }

    async createTables() {
        return new Promise((resolve, reject) => {
            // 음식점 테이블 생성
            const createRestaurantsTable = `
                CREATE TABLE IF NOT EXISTS restaurants (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    category TEXT,
                    area TEXT,
                    address TEXT,
                    road_address TEXT,
                    phone TEXT,
                    rating REAL,
                    review_count INTEGER,
                    price_range TEXT,
                    specialties TEXT,
                    description TEXT,
                    latitude REAL,
                    longitude REAL,
                    franchise INTEGER DEFAULT 0,
                    google_place_id TEXT,
                    google_rating REAL,
                    google_reviews TEXT,
                    opening_hours TEXT,
                    website TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            // 검색 최적화를 위한 인덱스 생성
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_restaurants_name ON restaurants(name)',
                'CREATE INDEX IF NOT EXISTS idx_restaurants_area ON restaurants(area)',
                'CREATE INDEX IF NOT EXISTS idx_restaurants_category ON restaurants(category)',
                'CREATE INDEX IF NOT EXISTS idx_restaurants_rating ON restaurants(rating)',
                'CREATE INDEX IF NOT EXISTS idx_restaurants_location ON restaurants(latitude, longitude)',
                'CREATE INDEX IF NOT EXISTS idx_restaurants_search ON restaurants(name, area, category)'
            ];

            // FTS (Full Text Search) 테이블 생성 - 한국어 검색 최적화
            const createFTSTable = `
                CREATE VIRTUAL TABLE IF NOT EXISTS restaurants_fts USING fts5(
                    name, 
                    category, 
                    area, 
                    specialties, 
                    description,
                    content='restaurants',
                    content_rowid='id'
                )
            `;

            // FTS 트리거 생성 - 데이터 동기화
            const createFTSTriggers = [
                `CREATE TRIGGER IF NOT EXISTS restaurants_ai AFTER INSERT ON restaurants BEGIN
                    INSERT INTO restaurants_fts(rowid, name, category, area, specialties, description) 
                    VALUES (new.id, new.name, new.category, new.area, new.specialties, new.description);
                END`,
                
                `CREATE TRIGGER IF NOT EXISTS restaurants_ad AFTER DELETE ON restaurants BEGIN
                    INSERT INTO restaurants_fts(restaurants_fts, rowid, name, category, area, specialties, description) 
                    VALUES('delete', old.id, old.name, old.category, old.area, old.specialties, old.description);
                END`,
                
                `CREATE TRIGGER IF NOT EXISTS restaurants_au AFTER UPDATE ON restaurants BEGIN
                    INSERT INTO restaurants_fts(restaurants_fts, rowid, name, category, area, specialties, description) 
                    VALUES('delete', old.id, old.name, old.category, old.area, old.specialties, old.description);
                    INSERT INTO restaurants_fts(rowid, name, category, area, specialties, description) 
                    VALUES (new.id, new.name, new.category, new.area, new.specialties, new.description);
                END`
            ];

            this.db.serialize(() => {
                // 테이블 생성
                this.db.run(createRestaurantsTable, (err) => {
                    if (err) {
                        console.error('테이블 생성 오류:', err);
                        reject(err);
                        return;
                    }
                    console.log('✅ restaurants 테이블 생성 완료');
                });

                // 인덱스 생성
                indexes.forEach((indexSQL, i) => {
                    this.db.run(indexSQL, (err) => {
                        if (err) {
                            console.error(`인덱스 ${i+1} 생성 오류:`, err);
                        } else {
                            console.log(`✅ 인덱스 ${i+1} 생성 완료`);
                        }
                    });
                });

                // FTS 테이블 생성
                this.db.run(createFTSTable, (err) => {
                    if (err) {
                        console.error('FTS 테이블 생성 오류:', err);
                    } else {
                        console.log('✅ FTS 테이블 생성 완료');
                    }
                });

                // FTS 트리거 생성
                createFTSTriggers.forEach((triggerSQL, i) => {
                    this.db.run(triggerSQL, (err) => {
                        if (err) {
                            console.error(`FTS 트리거 ${i+1} 생성 오류:`, err);
                        } else {
                            console.log(`✅ FTS 트리거 ${i+1} 생성 완료`);
                        }
                    });
                });

                resolve();
            });
        });
    }

    // 데이터베이스 상태 확인
    async checkDatabase() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT COUNT(*) as count FROM restaurants", (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                console.log(`📊 현재 저장된 음식점 수: ${row.count}개`);
                resolve(row.count);
            });
        });
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
        const dbSetup = new DatabaseSetup();
        
        try {
            console.log('🗄️ SQLite 데이터베이스 설정 시작...');
            await dbSetup.createTables();
            await dbSetup.checkDatabase();
            console.log('✅ 데이터베이스 설정 완료!');
        } catch (error) {
            console.error('❌ 데이터베이스 설정 실패:', error);
        } finally {
            dbSetup.close();
        }
    }
    
    main();
}

module.exports = DatabaseSetup;