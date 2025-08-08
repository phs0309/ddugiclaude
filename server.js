require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const restaurantService = require('./restaurantService');
const ogs = require('open-graph-scraper');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Claude API endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

    // API 키 확인
    if (!CLAUDE_API_KEY) {
        return res.status(500).json({ 
            error: 'Claude API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
            details: 'CLAUDE_API_KEY environment variable is required' 
        });
    }

    // 맛집 추천 요청인지 확인
    const isRecommendationRequest = restaurantService.isRestaurantRecommendationRequest(message);
    console.log('맛집 추천 요청 여부:', isRecommendationRequest);

    let relevantRestaurants = [];
    let searchCriteria = {};

    if (!isRecommendationRequest) {
        // 맛집 추천 요청이 아닌 경우 일반 대화
        const systemPrompt = `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마


응답 규칙:
- 항상 한국어로 답변하세요
- 사용자랑 친해지려고 노력해`;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': CLAUDE_API_KEY,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 500,
                    system: systemPrompt,
                    messages: [
                        {
                            role: 'user',
                            content: message
                        }
                    ]
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Claude API Error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return res.json({ 
                response: data.content[0].text,
                restaurants: [],
                searchCriteria: {},
                isRecommendation: false
            });
        } catch (error) {
            console.error('Error:', error);
            return res.status(500).json({ 
                error: 'API 요청 중 오류가 발생했습니다.' 
            });
        }
    }

    // 사용자 질문 분석하여 맛집 데이터 검색 (맛집 추천 요청인 경우만)
    searchCriteria = restaurantService.analyzeUserQuery(message);

    if (Object.keys(searchCriteria).length > 0) {
        relevantRestaurants = restaurantService.findRestaurants(searchCriteria);
    } else {
        // 키워드가 없으면 전체 검색
        relevantRestaurants = restaurantService.searchRestaurants(message);
    }

    // 결과가 없거나 너무 많으면 랜덤 추천
    if (relevantRestaurants.length === 0) {
        relevantRestaurants = restaurantService.getRandomRestaurants(3);
    } else if (relevantRestaurants.length > 5) {
        relevantRestaurants = relevantRestaurants.slice(0, 5);
    }

    const restaurantDataText = relevantRestaurants.map(restaurant => 
        `${restaurant.name} (${restaurant.area})
- 특징: ${restaurant.description}
- 대표메뉴: ${restaurant.specialties.join(', ')}`
    ).join('\n\n');

    const systemPrompt = `너 이름은 뚜기야, 부산 현지인 맛집을 소개시켜줘.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있어
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마

응답 규칙:
- 항상 한국어로 답변하세요
- 제공된 맛집 데이터를 기반으로만 추천하세요
- 각 맛집의 특징과 대표메뉴만 간단히 소개하세요
- 최대 3개의 맛집을 추천하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 실제 데이터에 없는 정보는 추가하지 마세요
- 주소나 가격 정보는 언급하지 마세요

사용 가능한 맛집 데이터:
${restaurantDataText}`;

    try {
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
                messages: [
                    {
                        role: 'user',
                        content: message
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Claude API Error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json({ 
            response: data.content[0].text,
            restaurants: relevantRestaurants,
            searchCriteria: searchCriteria,
            isRecommendation: true
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'API 호출 중 오류가 발생했습니다.',
            details: error.message 
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