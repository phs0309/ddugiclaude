const express = require('express');
const cors = require('cors');
const path = require('path');
const restaurantService = require('./restaurantService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Claude API endpoint
app.post('/api/chat', async (req, res) => {
    const { message } = req.body;
    const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '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';

    // 사용자 질문 분석하여 맛집 데이터 검색
    const searchCriteria = restaurantService.analyzeUserQuery(message);
    let relevantRestaurants = [];

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
- 주소: ${restaurant.address}
- 특징: ${restaurant.description}
- 가격대: ${restaurant.priceRange}
- 대표메뉴: ${restaurant.specialties.join(', ')}`
    ).join('\n\n');

    const systemPrompt = `당신은 "뚜기"라는 이름의 친근한 부산 맛집 전문 가이드입니다.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있습니다
- 친근하고 재미있는 말투로 대화합니다
- 이모지를 적절히 사용합니다
- 부산 사투리를 가끔 섞어서 사용합니다

응답 규칙:
- 항상 한국어로 답변하세요
- 제공된 맛집 데이터를 기반으로만 추천하세요
- 각 맛집마다 주소, 대표메뉴, 가격대, 특징을 포함하세요
- 최대 3개의 맛집을 추천하세요
- 친근하고 따뜻한 톤으로 대화하세요
- 실제 데이터에 없는 정보는 추가하지 마세요

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
            searchCriteria: searchCriteria
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ 
            error: 'API 호출 중 오류가 발생했습니다.',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT}에서 실행 중입니다`);
});