require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const RestaurantAI = require('./restaurantAI');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Restaurant AI 초기화
const restaurantAI = new RestaurantAI();

// 네이버 지도 API 엔드포인트 (로컬 테스트용)
app.get('/api/naver_map_api', (req, res) => {
    const clientId = process.env.naver_client_id;
    
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
        scriptUrl: `https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${clientId}&submodules=geocoder`,
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

// 서버 시작
app.listen(PORT, () => {
    console.log(`🚀 부산 맛집 추천 AI 서버 시작: http://localhost:${PORT}`);
    console.log(`📊 로드된 맛집 수: ${restaurantAI.getAllRestaurants().length}개`);
});