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

// 대화 메모리 저장소 (세션별)
const conversationMemory = new Map();

// Claude API endpoint
app.post('/api/chat', async (req, res) => {
    const { message, mode, sessionId = 'default_' + Date.now() } = req.body;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    // API 키 확인
    if (!CLAUDE_API_KEY) {
        return res.status(500).json({ 
            error: 'Claude API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
            details: 'CLAUDE_API_KEY environment variable is required' 
        });
    }

    // 대화 기록 가져오기 또는 초기화
    if (!conversationMemory.has(sessionId)) {
        conversationMemory.set(sessionId, []);
    }
    const conversationHistory = conversationMemory.get(sessionId);

    // 현재 사용자 메시지를 기록에 추가
    conversationHistory.push({ role: 'user', content: message });

    // 맛집 추천 서비스 로드
    const restaurantService = require('./restaurantService');
    
    // 맛집 추천 의도 감지
    const isRestaurantRequest = restaurantService.isRestaurantRecommendationRequest(message);
    
    let selectedRestaurants = [];
    let restaurantDataText = '';
    
    if (isRestaurantRequest) {
        // 맛집 추천 요청일 때만 맛집 데이터 포함
        const criteria = restaurantService.analyzeUserQuery(message);
        criteria.mode = mode; // 현재 선택된 모드 추가
        
        selectedRestaurants = restaurantService.findRestaurants(criteria).slice(0, 5);
        
        restaurantDataText = selectedRestaurants.map(restaurant => 
            `${restaurant.name} (${restaurant.area})
- 특징: ${restaurant.description}
- 대표메뉴: ${restaurant.specialties.join(', ')}`
        ).join('\n\n');
    }

    // 모드별 추천 방식 설정
    const getModeDescription = (mode) => {
        switch (mode) {
            case 'authentic':
                return `찐 맛집 모드: 유명하고 소문난 전통있는 맛집들을 우선적으로 추천해줘. 오래된 전통이나 명성이 있는 곳들을 강조해서 소개해.`;
            case 'budget':
                return `가성비 모드: 저렴하면서도 맛있는 현지인들이 자주 가는 동네 맛집들을 추천해줘. 가격 대비 만족도가 높은 곳들을 강조해서 소개해.`;
            case 'date':
                return `데이트 맛집 모드: 분위기 좋고 깔끔한 인테리어의 맛집들을 추천해줘. 연인과 함께 가기 좋은 곳들을 강조해서 소개해.`;
            default:
                return `일반적인 맛집을 자연스럽게 추천해줘.`;
        }
    };

    // 시스템 프롬프트 구성 (맛집 추천 여부에 따라 다르게)
    let systemPrompt;
    
    if (isRestaurantRequest && selectedRestaurants.length > 0) {
        systemPrompt = `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있어
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마

대화 방식:
- 자연스러운 대화를 통해 사용자의 취향과 상황을 파악해
- 맛집을 추천할 때는 대화 흐름에 맞춰서 적절한 시점에 추천해
- 사용자가 지역이나 음식 종류를 언급하면 그에 맞는 맛집을 추천해

${getModeDescription(mode)}

응답 규칙:
- 항상 한국어로 답변하세요
- 아래 제공된 맛집 데이터를 기반으로만 추천하세요
- 자연스러운 대화 흐름 속에서 맛집을 소개하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 실제 데이터에 없는 정보는 추가하지 마세요

사용 가능한 맛집 데이터:
${restaurantDataText}`;
    } else {
        systemPrompt = `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있어
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마

대화 방식:
- 자연스럽고 친근한 대화를 나누세요
- 사용자가 인사하거나 일반적인 질문을 하면 자연스럽게 응답해주세요
- 맛집에 대한 질문이 있을 때만 맛집을 추천해주세요

응답 규칙:
- 항상 한국어로 답변하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 자연스러운 대화를 이어가세요`;
    }

    try {
        // 대화 기록을 최대 10개까지만 유지 (토큰 제한 고려)
        const recentHistory = conversationHistory.slice(-10);
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 1000,
                system: systemPrompt,
                messages: recentHistory
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const aiResponse = data.content[0].text;
        
        // AI 응답을 대화 기록에 추가
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        
        // 대화 기록이 너무 길어지면 오래된 것부터 제거 (최대 20개 메시지)
        if (conversationHistory.length > 20) {
            conversationHistory.splice(0, conversationHistory.length - 20);
        }
        
        // 디버깅을 위해 맛집 추천 여부 로그 출력
        console.log('맛집 추천 요청:', isRestaurantRequest);
        if (selectedRestaurants.length > 0) {
            console.log('첫 번째 맛집 데이터:', {
                name: selectedRestaurants[0].name,
                image: selectedRestaurants[0].image,
                googleRating: selectedRestaurants[0].googleRating,
                googleReviewCount: selectedRestaurants[0].googleReviewCount
            });
        }
        
        res.json({ 
            response: aiResponse,
            restaurants: isRestaurantRequest ? selectedRestaurants : [],
            searchCriteria: {},
            isRecommendation: isRestaurantRequest
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'API 호출 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

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