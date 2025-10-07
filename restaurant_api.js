/**
 * SQLite 기반 음식점 검색 API
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class RestaurantAPI {
    constructor() {
        this.dbPath = path.join(__dirname, 'restaurants.db');
        this.db = new sqlite3.Database(this.dbPath);
    }

    // 전체 음식점 검색 (페이징 지원)
    async getAllRestaurants(page = 1, limit = 20, filters = {}) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            let whereClause = 'WHERE 1=1';
            const params = [];

            // 필터링 조건 추가
            if (filters.area) {
                whereClause += ' AND area LIKE ?';
                params.push(`%${filters.area}%`);
            }

            if (filters.category) {
                whereClause += ' AND category LIKE ?';
                params.push(`%${filters.category}%`);
            }

            if (filters.minRating) {
                whereClause += ' AND rating >= ?';
                params.push(filters.minRating);
            }

            if (filters.minReviews) {
                whereClause += ' AND review_count >= ?';
                params.push(filters.minReviews);
            }

            // 프랜차이즈 제외
            if (filters.excludeFranchise) {
                whereClause += ' AND franchise = 0';
            }

            const countSQL = `SELECT COUNT(*) as total FROM restaurants ${whereClause}`;
            const dataSQL = `
                SELECT * FROM restaurants 
                ${whereClause} 
                ORDER BY rating DESC, review_count DESC 
                LIMIT ? OFFSET ?
            `;

            // 총 개수 조회
            this.db.get(countSQL, params, (err, countRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 데이터 조회
                this.db.all(dataSQL, [...params, limit, offset], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({
                        data: rows,
                        pagination: {
                            page: page,
                            limit: limit,
                            total: countRow.total,
                            totalPages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            });
        });
    }

    // 텍스트 검색 (Full Text Search 사용)
    async searchRestaurants(query, page = 1, limit = 20) {
        return new Promise((resolve, reject) => {
            const offset = (page - 1) * limit;
            
            // FTS를 사용한 검색
            const searchSQL = `
                SELECT r.*, 
                       fts.rank,
                       snippet(restaurants_fts, 0, '<mark>', '</mark>', '...', 32) as highlight
                FROM restaurants_fts fts
                JOIN restaurants r ON r.id = fts.rowid
                WHERE restaurants_fts MATCH ?
                ORDER BY fts.rank, r.rating DESC
                LIMIT ? OFFSET ?
            `;

            const countSQL = `
                SELECT COUNT(*) as total
                FROM restaurants_fts
                WHERE restaurants_fts MATCH ?
            `;

            // 검색어 처리 (한국어 지원)
            const processedQuery = this.processSearchQuery(query);

            // 총 개수 조회
            this.db.get(countSQL, [processedQuery], (err, countRow) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 검색 실행
                this.db.all(searchSQL, [processedQuery, limit, offset], (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve({
                        data: rows,
                        query: query,
                        pagination: {
                            page: page,
                            limit: limit,
                            total: countRow.total,
                            totalPages: Math.ceil(countRow.total / limit)
                        }
                    });
                });
            });
        });
    }

    // 주변 음식점 검색 (위도/경도 기반)
    async getNearbyRestaurants(lat, lng, radius = 1000, limit = 20) {
        return new Promise((resolve, reject) => {
            // Haversine 공식을 사용한 거리 계산
            const nearbySQL = `
                SELECT *,
                    (6371000 * acos(
                        cos(radians(?)) * cos(radians(latitude)) * 
                        cos(radians(longitude) - radians(?)) + 
                        sin(radians(?)) * sin(radians(latitude))
                    )) AS distance
                FROM restaurants
                WHERE latitude IS NOT NULL 
                    AND longitude IS NOT NULL
                    AND latitude != 0 
                    AND longitude != 0
                HAVING distance <= ?
                ORDER BY distance ASC, rating DESC
                LIMIT ?
            `;

            this.db.all(nearbySQL, [lat, lng, lat, radius, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    data: rows,
                    center: { lat, lng },
                    radius: radius
                });
            });
        });
    }

    // 추천 음식점 (평점 높은 순)
    async getRecommendedRestaurants(limit = 10) {
        return new Promise((resolve, reject) => {
            const recommendSQL = `
                SELECT * FROM restaurants
                WHERE rating >= 4.0 
                    AND review_count >= 10
                    AND franchise = 0
                ORDER BY rating DESC, review_count DESC
                LIMIT ?
            `;

            this.db.all(recommendSQL, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    data: rows,
                    criteria: 'rating >= 4.0 AND review_count >= 10'
                });
            });
        });
    }

    // 카테고리별 음식점
    async getRestaurantsByCategory(category, limit = 20) {
        return new Promise((resolve, reject) => {
            const categorySQL = `
                SELECT * FROM restaurants
                WHERE category LIKE ?
                ORDER BY rating DESC, review_count DESC
                LIMIT ?
            `;

            this.db.all(categorySQL, [`%${category}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    data: rows,
                    category: category
                });
            });
        });
    }

    // 지역별 음식점
    async getRestaurantsByArea(area, limit = 20) {
        return new Promise((resolve, reject) => {
            const areaSQL = `
                SELECT * FROM restaurants
                WHERE area LIKE ?
                ORDER BY rating DESC, review_count DESC
                LIMIT ?
            `;

            this.db.all(areaSQL, [`%${area}%`, limit], (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve({
                    data: rows,
                    area: area
                });
            });
        });
    }

    // 음식점 상세 정보
    async getRestaurantById(id) {
        return new Promise((resolve, reject) => {
            const detailSQL = 'SELECT * FROM restaurants WHERE id = ?';
            
            this.db.get(detailSQL, [id], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    reject(new Error('음식점을 찾을 수 없습니다.'));
                    return;
                }

                resolve(row);
            });
        });
    }

    // 통계 정보
    async getStatistics() {
        return new Promise((resolve, reject) => {
            const statsSQL = `
                SELECT 
                    COUNT(*) as total_restaurants,
                    COUNT(DISTINCT area) as total_areas,
                    COUNT(DISTINCT category) as total_categories,
                    AVG(rating) as average_rating,
                    SUM(review_count) as total_reviews
                FROM restaurants
            `;

            this.db.get(statsSQL, [], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(row);
            });
        });
    }

    // 검색어 처리 (한국어 지원)
    processSearchQuery(query) {
        // 공백을 AND로 연결
        const terms = query.trim().split(/\s+/);
        return terms.join(' AND ');
    }

    // 데이터베이스 연결 종료
    close() {
        this.db.close();
    }
}

// Express.js와 통합
function createRestaurantRoutes(app) {
    const api = new RestaurantAPI();

    // 전체 음식점 조회
    app.get('/api/restaurants', async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                area: req.query.area,
                category: req.query.category,
                minRating: req.query.minRating ? parseFloat(req.query.minRating) : null,
                minReviews: req.query.minReviews ? parseInt(req.query.minReviews) : null,
                excludeFranchise: req.query.excludeFranchise === 'true'
            };

            const result = await api.getAllRestaurants(page, limit, filters);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 검색
    app.get('/api/restaurants/search', async (req, res) => {
        try {
            const query = req.query.q;
            if (!query) {
                return res.status(400).json({ error: '검색어가 필요합니다.' });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await api.searchRestaurants(query, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 주변 음식점
    app.get('/api/restaurants/nearby', async (req, res) => {
        try {
            const lat = parseFloat(req.query.lat);
            const lng = parseFloat(req.query.lng);
            const radius = parseInt(req.query.radius) || 1000;
            const limit = parseInt(req.query.limit) || 20;

            if (!lat || !lng) {
                return res.status(400).json({ error: '위도와 경도가 필요합니다.' });
            }

            const result = await api.getNearbyRestaurants(lat, lng, radius, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 추천 음식점
    app.get('/api/restaurants/recommended', async (req, res) => {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const result = await api.getRecommendedRestaurants(limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 카테고리별
    app.get('/api/restaurants/category/:category', async (req, res) => {
        try {
            const category = req.params.category;
            const limit = parseInt(req.query.limit) || 20;
            const result = await api.getRestaurantsByCategory(category, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 지역별
    app.get('/api/restaurants/area/:area', async (req, res) => {
        try {
            const area = req.params.area;
            const limit = parseInt(req.query.limit) || 20;
            const result = await api.getRestaurantsByArea(area, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 상세 정보
    app.get('/api/restaurants/:id', async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const result = await api.getRestaurantById(id);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    // 통계
    app.get('/api/statistics', async (req, res) => {
        try {
            const result = await api.getStatistics();
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });

    return api;
}

module.exports = { RestaurantAPI, createRestaurantRoutes };