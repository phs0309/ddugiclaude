require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { loadVisitBusanData } = require('./visitBusanDataLoader');
const ogs = require('open-graph-scraper');
const { createRestaurantRoutes } = require('./restaurant_api');
const TagRestaurantMatcher = require('./tag-restaurant-matcher');
const { InstagramOnlyScraper } = require('./instagram-only-scraper');

const app = express();
const PORT = process.env.PORT || 3012;

// 비짓부산 데이터만 사용
let visitBusanRestaurants = [];

// 서버 시작 시 비짓부산 데이터 로드
async function initializeData() {
    try {
        visitBusanRestaurants = await loadVisitBusanData('./R_data/비짓부산_cleaned_reviews.csv');
        console.log(`비짓부산 맛집 데이터 로드 완료: ${visitBusanRestaurants.length}개`);
    } catch (error) {
        console.error('비짓부산 데이터 로드 실패:', error);
        visitBusanRestaurants = [];
    }
}

// 데이터 초기화 실행
initializeData();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SQLite API 라우트 추가
const restaurantAPI = createRestaurantRoutes(app);

// Instagram Tag Analyzer API endpoints
app.post('/api/tag-analyzer', async (req, res) => {
    try {
        const matcher = new TagRestaurantMatcher();
        const { hashtags, action = 'analyze' } = req.body;

        if (!hashtags || !Array.isArray(hashtags)) {
            return res.status(400).json({ 
                error: '해시태그 배열이 필요합니다' 
            });
        }

        switch (action) {
            case 'analyze':
                const analysisResult = matcher.findRestaurantsByTags(hashtags);
                res.json(analysisResult);
                break;

            case 'route':
                const routeResult = matcher.suggestFoodRoute(hashtags);
                res.json(routeResult);
                break;

            case 'statistics':
                const statsResult = matcher.getHashtagStatistics(hashtags);
                res.json(statsResult);
                break;

            default:
                res.status(400).json({ error: '지원하지 않는 action입니다' });
        }

    } catch (error) {
        console.error('Tag Analyzer Error:', error);
        res.status(500).json({ 
            error: '서버 내부 오류가 발생했습니다',
            details: error.message 
        });
    }
});

app.get('/api/tag-analyzer', async (req, res) => {
    try {
        const matcher = new TagRestaurantMatcher();
        const { action } = req.query;

        switch (action) {
            case 'popular':
                const popularResult = matcher.getRestaurantsByPopularTags();
                res.json(popularResult);
                break;

            case 'trending':
                const trendingResult = matcher.getTrendingRestaurants();
                res.json(trendingResult);
                break;

            case 'tags':
                const tagsResult = matcher.tagAnalyzer.getPopularBusanTags();
                res.json(tagsResult);
                break;

            default:
                res.json({
                    message: '부산 맛집 인스타그램 태그 분석기',
                    endpoints: {
                        'POST /api/tag-analyzer': '해시태그 분석 및 맛집 추천',
                        'GET /api/tag-analyzer?action=popular': '인기 태그별 맛집',
                        'GET /api/tag-analyzer?action=trending': '트렌딩 태그 분석',
                        'GET /api/tag-analyzer?action=tags': '인기 부산 맛집 태그'
                    }
                });
        }

    } catch (error) {
        console.error('Tag Analyzer Error:', error);
        res.status(500).json({ 
            error: '서버 내부 오류가 발생했습니다',
            details: error.message 
        });
    }
});

// 키워드 기반 맛집 추천 시스템
app.post('/api/chat', async (req, res) => {
    const { message, mode, sessionId = 'default_' + Date.now() } = req.body;

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    console.log(`💬 로컬 서버 메시지: "${message}" (세션: ${sessionId})`);

    try {
        // 키워드 기반 분석으로 맛집 요청 처리
        const visitBusanService = require('./api/visitBusanService.cjs');
        const criteria = visitBusanService.analyzeUserQuery(message);
        console.log('🔍 분석된 조건:', criteria);

        // 맛집 관련 요청인지 확인
        const isRestaurantRequest = isRestaurantQuery(message);
        
        if (isRestaurantRequest) {
            // 맛집 검색 실행
            const restaurants = visitBusanService.findRestaurants(criteria);
            console.log(`📍 찾은 맛집 수: ${restaurants.length}개`);

            // 간단한 응답 생성
            const response = generateSimpleResponse(restaurants, criteria);

            return res.json({
                response: response,
                restaurants: restaurants.slice(0, 6),
                conversationType: 'restaurant_recommendation',
                currentTime: getCurrentKoreaTime(),
                isRecommendation: true
            });
        } else {
            // 일반 대화 처리
            const casualResponse = generateCasualResponse(message);
            
            return res.json({
                response: casualResponse,
                restaurants: [],
                conversationType: 'casual',
                currentTime: getCurrentKoreaTime(),
                isRecommendation: false
            });
        }

    } catch (error) {
        console.error('대화 처리 오류:', error);
        
        return res.json({
            response: `마! 미안하다... 😅\n\n잠깐 머리가 하얘졌네. 다시 말해봐라!`,
            restaurants: [],
            conversationType: 'error',
            isRecommendation: false
        });
    }
});

// 맛집 요청인지 키워드로 판단
function isRestaurantQuery(message) {
    const lowerMessage = message.toLowerCase();
    
    // 맛집 관련 키워드
    const restaurantKeywords = [
        '맛집', '식당', '먹을', '추천', '알려줘', '소개', '찾아줘',
        '어디', '가자', '가고싶어', '먹고싶어', '먹을까', '어떨까',
        '점심', '저녁', '아침', '간식', '야식', '브런치'
    ];
    
    // 음식 키워드
    const foodKeywords = [
        '돼지국밥', '밀면', '회', '갈비', '치킨', '족발', '곱창',
        '국밥', '면', '파스타', '피자', '초밥', '삼겹살', '냉면',
        '커피', '카페', '디저트', '케이크', '떡볶이', '김밥'
    ];
    
    // 지역 키워드
    const areaKeywords = [
        '해운대', '센텀', '서면', '남포동', '광안리', '기장',
        '동래', '부산대', '장전동', '사직', '덕천'
    ];
    
    return restaurantKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           foodKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           (areaKeywords.some(keyword => lowerMessage.includes(keyword)) && 
            (lowerMessage.includes('먹') || lowerMessage.includes('맛')));
}

// 간단한 맛집 응답 생성
function generateSimpleResponse(restaurants, criteria) {
    if (restaurants.length === 0) {
        return `마! 그 조건으론 맛집을 못 찾겠네... 😅\n\n다른 지역이나 음식으로 다시 말해봐라!`;
    }
    
    const area = criteria.area || '부산';
    const keyword = criteria.keyword || criteria.category || '맛집';
    
    return `마! ${area}에서 ${keyword} 맛집들 찾았다이가! 🐧\n\n아래 카드들 확인해봐라~ 다 맛있는 곳들이야!`;
}

// 일반 대화 응답
function generateCasualResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('안녕') || lowerMessage.includes('하이')) {
        return `마! 뚜기다이가! 🐧 반갑다!`;
    }
    
    if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
        return `마! 뭘 고마워하노! 😊`;
    }
    
    if (lowerMessage.includes('어떻게') || lowerMessage.includes('어때')) {
        return `마! 좋다이가! 😄 또 뭔 얘기할까?`;
    }
    
    return `마! 뚜기다이가! 🐧 뭔 얘기할까?`;
}

// 한국 시간 가져오기
function getCurrentKoreaTime() {
    const now = new Date();
    return new Intl.DateTimeFormat('ko-KR', { 
        timeZone: 'Asia/Seoul', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).format(now);
}

// Instagram Only Scraper API (인스타그램 전용)
app.post('/api/instagram-scraper', async (req, res) => {
    try {
        const scraper = new InstagramOnlyScraper();
        const { hashtags, maxHashtags = 8 } = req.body;
        
        if (hashtags && Array.isArray(hashtags)) {
            scraper.busanHashtags = hashtags;
        }

        console.log(`📱 Instagram 해시태그 분석 시작 - ${maxHashtags}개`);
        const results = await scraper.analyzeAllHashtags(maxHashtags);
        
        res.json({
            success: true,
            data: results,
            message: `${Object.keys(results.hashtags).length}개 해시태그 Instagram 분석 완료`,
            timestamp: new Date().toISOString(),
            dataType: 'instagram_only'
        });

    } catch (error) {
        console.error('Instagram scraping error:', error);
        res.status(500).json({
            success: false,
            error: 'Instagram 해시태그 분석 중 오류가 발생했습니다.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.get('/api/instagram-scraper', async (req, res) => {
    try {
        const scraper = new InstagramOnlyScraper();
        console.log('📱 Instagram 해시태그 분석 실행 중...');
        const results = await scraper.analyzeAllHashtags(5);
        
        res.json({
            success: true,
            data: results,
            message: 'Instagram 해시태그 분석이 완료되었습니다.',
            timestamp: new Date().toISOString(),
            dataType: 'instagram_only'
        });

    } catch (error) {
        console.error('Instagram scraping error:', error);
        res.status(500).json({
            success: false,
            error: 'Instagram 해시태그 분석 중 오류가 발생했습니다.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// OG 메타데이터 가져오는 엔드포인트
app.get('/api/og-data', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    try {
        const { error, result } = await ogs({ url });
        
        if (error) {
            console.error('OGS Error:', error);
            return res.status(500).json({ error: 'Failed to fetch OG data' });
        }
        
        res.json({
            title: result.ogTitle || result.twitterTitle || 'No title',
            description: result.ogDescription || result.twitterDescription || 'No description',
            image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null,
            url: result.ogUrl || url
        });
    } catch (error) {
        console.error('Error fetching OG data:', error);
        res.status(500).json({ error: 'Failed to fetch OG data' });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다`);
});