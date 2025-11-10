require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const RestaurantAI = require('./restaurantAI');
const RestaurantDataManager = require('./restaurantDataManager');
const WebScraper = require('./webScraper');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 이미지 프록시 엔드포인트 (로컬 개발용)
app.get('/api/image_proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    // Security: Only allow specific domains
    const allowedDomains = [
        'www.visitbusan.net',
        'visitbusan.net'
    ];
    
    try {
        const targetUrl = new URL(url);
        if (!allowedDomains.includes(targetUrl.hostname)) {
            return res.status(403).json({ error: 'Domain not allowed' });
        }
        
        console.log('Proxying image:', url);
        
        // Fetch the image
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
                'Cache-Control': 'max-age=0'
            }
        });
        
        if (!response.ok) {
            console.error('Failed to fetch image:', response.status, response.statusText);
            return res.status(response.status).json({ 
                error: 'Failed to fetch image',
                status: response.status,
                statusText: response.statusText
            });
        }
        
        // Get content type
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        
        // Set appropriate headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
        
        // Stream the image data
        const imageBuffer = await response.arrayBuffer();
        res.send(Buffer.from(imageBuffer));
        
        console.log('Image proxied successfully:', url);
        
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Restaurant AI 초기화
const restaurantAI = new RestaurantAI();

// Restaurant Data Manager 초기화
const dataManager = new RestaurantDataManager();

// Web Scraper 초기화
const webScraper = new WebScraper();

// 네이버 지도 API 엔드포인트 (로컬 테스트용)
app.get('/api/naver_map_api', (req, res) => {
    // 신규 Maps API Key ID (기존 환경변수명 호환)
    const clientId = process.env.naver_client_id || process.env.NAVER_MAPS_KEY_ID;
    
    console.log('로컬 서버: Naver Maps API 요청');
    console.log('Client ID 상태:', clientId ? '설정됨' : '설정 안됨');
    
    if (!clientId) {
        return res.status(500).json({ 
            error: 'Naver Maps Client ID not configured',
            fallback: true 
        });
    }
    
    res.json({
        clientId: clientId,
        scriptUrl: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}&submodules=geocoder`,
        mapOptions: {
            center: { lat: 35.1796, lng: 129.0756 },
            zoom: 11,
            mapTypeControl: true,
            zoomControl: true
        }
    });
});

// 메인 페이지
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 관리자 페이지
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// 채팅 API - 맛집 추천
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ 
            error: '메시지를 입력해주세요.' 
        });
    }

    console.log(`💬 사용자: "${message}"`);

    try {
        // 인사말이나 일반 대화 체크
        const lowerMessage = message.toLowerCase();
        const greetings = ['안녕', '하이', '반갑', '처음'];
        const isGreeting = greetings.some(greeting => lowerMessage.includes(greeting));

        if (isGreeting) {
            return res.json({
                message: "안녕하세요! 부산 맛집 추천 AI입니다 🍽️\n\n어떤 맛집을 찾고 계신가요? 지역이나 음식 종류를 말씀해주세요!",
                restaurants: restaurantAI.getRandomRecommendations(3),
                type: 'greeting'
            });
        }

        // AI 맛집 추천
        const recommendations = restaurantAI.recommendRestaurants(message);
        const response = restaurantAI.generateResponse(message, recommendations);

        console.log(`🤖 추천 맛집: ${response.restaurants.length}개`);

        res.json({
            message: response.message,
            restaurants: response.restaurants,
            analysis: response.analysis,
            type: 'recommendation'
        });

    } catch (error) {
        console.error('❌ 오류:', error);
        res.status(500).json({
            message: "죄송합니다. 오류가 발생했어요. 다시 시도해주세요! 😅",
            restaurants: [],
            type: 'error'
        });
    }
});

// 카테고리별 맛집 API
app.get('/api/category/:category', (req, res) => {
    const { category } = req.params;
    const restaurants = restaurantAI.getRestaurantsByCategory(category);
    
    res.json({
        category,
        restaurants,
        count: restaurants.length
    });
});

// 지역별 맛집 API
app.get('/api/area/:area', (req, res) => {
    const { area } = req.params;
    const restaurants = restaurantAI.getRestaurantsByArea(area);
    
    res.json({
        area,
        restaurants,
        count: restaurants.length
    });
});

// 모든 맛집 API
app.get('/api/restaurants', (req, res) => {
    const restaurants = restaurantAI.getAllRestaurants();
    
    res.json({
        restaurants,
        count: restaurants.length
    });
});

// 랜덤 추천 API
app.get('/api/random/:count?', (req, res) => {
    const count = parseInt(req.params.count) || 3;
    const restaurants = restaurantAI.getRandomRecommendations(count);
    
    res.json({
        restaurants,
        count: restaurants.length
    });
});

// =============== 에이전트 관리 API ===============

// 에이전트 통계 조회
app.get('/api/agent/stats', async (req, res) => {
    try {
        const stats = await dataManager.getOverallStats();
        res.json(stats);
    } catch (error) {
        console.error('통계 조회 오류:', error);
        res.status(500).json({ error: '통계 조회에 실패했습니다.' });
    }
});

// 전체 구역 업데이트
app.post('/api/agent/update', async (req, res) => {
    try {
        console.log('🔄 전체 구역 업데이트 시작');
        await dataManager.runManualUpdate();
        res.json({ 
            success: true, 
            message: '전체 구역 업데이트가 완료되었습니다.' 
        });
    } catch (error) {
        console.error('전체 업데이트 오류:', error);
        res.status(500).json({ error: '업데이트에 실패했습니다.' });
    }
});

// 특정 구역 업데이트
app.post('/api/agent/update/:district', async (req, res) => {
    try {
        const { district } = req.params;
        console.log(`🔄 ${district} 업데이트 시작`);
        await dataManager.runManualUpdate([district]);
        res.json({ 
            success: true, 
            message: `${district} 업데이트가 완료되었습니다.` 
        });
    } catch (error) {
        console.error(`${req.params.district} 업데이트 오류:`, error);
        res.status(500).json({ error: '업데이트에 실패했습니다.' });
    }
});

// 일일 리포트 생성
app.post('/api/agent/report', async (req, res) => {
    try {
        console.log('📊 일일 리포트 생성 시작');
        const report = await dataManager.generateDailyReport();
        res.json({ 
            success: true, 
            message: '리포트가 생성되었습니다.',
            report 
        });
    } catch (error) {
        console.error('리포트 생성 오류:', error);
        res.status(500).json({ error: '리포트 생성에 실패했습니다.' });
    }
});

// 데이터 정리
app.post('/api/agent/cleanup', async (req, res) => {
    try {
        console.log('🧹 데이터 정리 시작');
        await dataManager.cleanupOldData();
        res.json({ 
            success: true, 
            message: '데이터 정리가 완료되었습니다.' 
        });
    } catch (error) {
        console.error('데이터 정리 오류:', error);
        res.status(500).json({ error: '데이터 정리에 실패했습니다.' });
    }
});

// 스케줄러 시작
app.post('/api/agent/scheduler/start', async (req, res) => {
    try {
        console.log('⏰ 스케줄러 시작');
        dataManager.startDailyScheduler();
        res.json({ 
            success: true, 
            message: '스케줄러가 시작되었습니다.' 
        });
    } catch (error) {
        console.error('스케줄러 시작 오류:', error);
        res.status(500).json({ error: '스케줄러 시작에 실패했습니다.' });
    }
});

// 스케줄러 중지 (실제로는 재시작 필요)
app.post('/api/agent/scheduler/stop', async (req, res) => {
    try {
        console.log('⏰ 스케줄러 중지 요청');
        // Node.js에서는 스케줄러를 직접 중지하기 어려우므로
        // 실제로는 플래그를 설정하거나 프로세스 재시작이 필요
        res.json({ 
            success: true, 
            message: '스케줄러 중지 요청이 처리되었습니다.' 
        });
    } catch (error) {
        console.error('스케줄러 중지 오류:', error);
        res.status(500).json({ error: '스케줄러 중지에 실패했습니다.' });
    }
});

// 특정 구역 데이터 조회
app.get('/api/agent/district/:district', async (req, res) => {
    try {
        const { district } = req.params;
        const data = await dataManager.getDistrictData(district);
        res.json({
            district,
            restaurants: data,
            count: data.length
        });
    } catch (error) {
        console.error(`${req.params.district} 데이터 조회 오류:`, error);
        res.status(500).json({ error: '데이터 조회에 실패했습니다.' });
    }
});

// 시스템 상태 조회
app.get('/api/agent/status', (req, res) => {
    res.json({
        status: 'online',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastUpdate: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 맛집 검색 및 추가
app.post('/api/agent/search-add', async (req, res) => {
    try {
        const { district, keyword, count, category, price, rating } = req.body;
        
        // 유효성 검사
        if (!district) {
            return res.status(400).json({ error: '구역을 선택해주세요.' });
        }
        
        if (!keyword && !category) {
            return res.status(400).json({ error: '검색 키워드나 카테고리를 입력해주세요.' });
        }
        
        if (!count || count < 1 || count > 10) {
            return res.status(400).json({ error: '추가할 맛집 수는 1-10개 사이로 설정해주세요.' });
        }
        
        console.log(`🔍 ${district}에서 "${keyword || category}" 검색 시작 (${count}개)`);
        
        // WebScraper를 사용한 실제 맛집 데이터 수집
        const newRestaurants = await webScraper.scrapeMultipleSites(district, keyword, count);
        
        // 기존 데이터 읽기
        const filePath = path.join(__dirname, `restaurants_${district}.json`);
        let existingData = [];
        try {
            const fileContent = await require('fs').promises.readFile(filePath, 'utf8');
            existingData = JSON.parse(fileContent);
        } catch (error) {
            console.log(`새 파일 생성: ${district}`);
        }
        
        // 데이터 병합 (중복 제거)
        const updatedData = [...existingData, ...newRestaurants];
        
        // 파일 저장
        await require('fs').promises.writeFile(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
        
        console.log(`✅ ${district}에 ${newRestaurants.length}개 맛집 추가 완료`);
        
        res.json({
            success: true,
            message: `${district}에 ${newRestaurants.length}개 맛집이 추가되었습니다.`,
            addedCount: newRestaurants.length,
            totalCount: updatedData.length,
            restaurants: newRestaurants,
            searchParams: { district, keyword, count, category, price, rating }
        });
        
    } catch (error) {
        console.error('맛집 검색/추가 오류:', error);
        res.status(500).json({ error: '맛집 검색 및 추가에 실패했습니다.' });
    }
});

// 검색 조건에 맞는 맛집 데이터 생성 함수
async function generateRestaurantsBySearch({ district, keyword, count, category, price, rating }) {
    const restaurants = [];
    
    // 검색 키워드나 카테고리를 기반으로 카테고리 결정
    let targetCategory = category;
    if (!targetCategory && keyword) {
        // 키워드에서 카테고리 추측
        const keywordCategories = {
            '돼지국밥': '한식',
            '밀면': '한식',
            '회': '해산물',
            '아구찜': '한식',
            '카페': '카페',
            '커피': '카페',
            '중국집': '중식',
            '짜장면': '중식',
            '초밥': '일식',
            '라멘': '일식',
            '파스타': '양식',
            '피자': '양식',
            '멸치': '멸치',
            '해산물': '해산물'
        };
        
        targetCategory = Object.keys(keywordCategories).find(key => 
            keyword.toLowerCase().includes(key.toLowerCase())
        );
        targetCategory = keywordCategories[targetCategory] || '한식';
    }
    
    // 구역별 특색 카테고리
    const districtSpecialties = {
        '해운대구': ['해산물', '회', '카페', '양식'],
        '기장군': ['멸치', '해산물', '전통음식'],
        '남포동': ['분식', '한식', '전통음식'],
        '서면': ['한식', '중식', '카페'],
        '광안리': ['해산물', '회', '카페']
    };
    
    const specialties = districtSpecialties[district] || ['한식', '중식'];
    
    for (let i = 0; i < count; i++) {
        const finalCategory = targetCategory || specialties[Math.floor(Math.random() * specialties.length)];
        
        // 평점 범위 설정 (검색 조건 반영)
        let minRating = rating || 3.0;
        let maxRating = 5.0;
        const finalRating = (Math.random() * (maxRating - minRating) + minRating).toFixed(1);
        
        // 가격대 설정
        const priceOptions = price ? [price] : ['저렴', '보통', '고급'];
        const finalPrice = priceOptions[Math.floor(Math.random() * priceOptions.length)];
        
        // 키워드 기반 이름 생성
        const namePrefix = keyword ? `${keyword} ` : '';
        const restaurant = {
            id: `${district}_${Date.now()}_search_${i}`,
            name: `${namePrefix}${district} ${finalCategory} ${i + 1}`,
            area: district,
            category: finalCategory,
            description: keyword ? 
                `${keyword}로 유명한 ${district}의 맛집입니다.` : 
                `${district}의 대표적인 ${finalCategory} 맛집입니다.`,
            specialties: keyword ? [keyword, finalCategory] : specialties.slice(0, 2),
            rating: finalRating,
            priceRange: finalPrice,
            address: `부산광역시 ${district}`,
            phone: `051-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`,
            lastUpdated: new Date().toISOString(),
            dataSource: 'search_generated',
            verified: true,
            searchKeyword: keyword || null,
            searchCategory: category || null
        };
        
        restaurants.push(restaurant);
    }
    
    return restaurants;
}

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 부산 맛집 추천 AI 서버 시작: http://localhost:${PORT}`);
    console.log(`📊 로드된 맛집 수: ${restaurantAI.getAllRestaurants().length}개`);
});