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

// 새로운 AI 대화 관리자 import
const AIConversationManager = require('./api/aiConversationManagerServer.cjs');
const aiManager = new AIConversationManager();

// Claude API endpoint  
app.post('/api/chat', async (req, res) => {
    const { message, mode, sessionId = 'default_' + Date.now() } = req.body;

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    console.log(`💬 로컬 서버 메시지: "${message}" (세션: ${sessionId})`);

    try {
        // 1단계: AI가 먼저 대화를 처리하고 맛집 데이터가 필요한지 판단
        let initialResponse = await aiManager.handleConversation(message, sessionId, []);
        
        console.log('🤖 AI 1차 응답:', {
            conversationType: initialResponse.conversationType,
            needsRestaurantData: initialResponse.needsRestaurantData,
            searchQuery: initialResponse.searchQuery
        });

        // 2단계: AI가 맛집 데이터를 요청했다면 검색해서 다시 처리
        if (initialResponse.needsRestaurantData && initialResponse.searchQuery) {
            console.log('🔍 맛집 검색 시작:', initialResponse.searchQuery);
            
            // 검색 조건에 맞는 맛집 데이터 가져오기
            const restaurantData = findRestaurantsForAI(initialResponse.searchQuery);
            console.log(`📍 찾은 맛집 수: ${restaurantData.length}개`);
            
            // 맛집 데이터와 함께 AI가 최종 응답 생성
            const finalResponse = await aiManager.handleConversation(
                message, 
                sessionId + '_final',
                restaurantData
            );
            
            return res.json({
                response: finalResponse.response,
                restaurants: finalResponse.restaurants || restaurantData.slice(0, 6),
                conversationType: finalResponse.conversationType,
                currentTime: finalResponse.currentTime,
                isRecommendation: true
            });
        }

        // 3단계: 일반 대화인 경우 그대로 반환
        return res.json({
            response: initialResponse.response,
            restaurants: [],
            conversationType: initialResponse.conversationType,
            currentTime: initialResponse.currentTime,
            isRecommendation: false
        });

    } catch (error) {
        console.error('AI 대화 처리 오류:', error);
        
        return res.json({
            response: `마! 미안하다... 😅\n\n잠깐 머리가 하얘졌네. 다시 말해봐라!`,
            restaurants: [],
            conversationType: 'error',
            isRecommendation: false
        });
    }
});

// AI 검색 쿼리를 실제 맛집 검색으로 변환 (로컬 서버용)
function findRestaurantsForAI(searchQuery) {
    try {
        // 맛집 서비스 로드
        const restaurantService = require('./restaurantService');
        
        const criteria = {
            timeHour: new Date().getHours()
        };
        
        if (searchQuery.area) {
            criteria.area = searchQuery.area;
        }
        
        if (searchQuery.category) {
            criteria.category = searchQuery.category;
        }
        
        if (searchQuery.keyword) {
            criteria.keyword = searchQuery.keyword;
        }
        
        // 기본적으로 평점 있는 맛집만
        criteria.minRating = 3.5;
        
        console.log('🔍 실제 검색 조건:', criteria);
        
        const results = restaurantService.findRestaurants(criteria);
        return results.slice(0, 20); // 최대 20개
        
    } catch (error) {
        console.error('맛집 검색 오류:', error);
        return [];
    }
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