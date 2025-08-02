export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({ error: '메시지가 필요합니다.' });
        }

        // 부산 맛집 데이터
        const restaurants = [
            {
                id: 1,
                name: "해운대암소갈비집",
                address: "부산 해운대구 중동 1394-65",
                description: "50년 전통의 숯불 갈비 전문점, 부드러운 한우갈비가 일품",
                priceRange: "30,000-50,000원",
                category: "한식",
                area: "해운대",
                specialties: ["한우갈비", "갈비탕", "냉면"]
            },
            {
                id: 2,
                name: "서면 돼지국밥 골목",
                address: "부산 부산진구 부전동 212-6",
                description: "부산의 대표 음식 돼지국밥의 본고장, 진한 국물과 수육이 일품",
                priceRange: "8,000-12,000원",
                category: "한식",
                area: "서면",
                specialties: ["돼지국밥", "수육", "순대국"]
            },
            {
                id: 3,
                name: "자갈치시장 회센터",
                address: "부산 중구 자갈치해안로 52",
                description: "부산 최대 수산시장, 싱싱한 회와 해산물을 현장에서 바로",
                priceRange: "20,000-40,000원",
                category: "해산물",
                area: "자갈치",
                specialties: ["회", "활어구이", "해물탕"]
            },
            {
                id: 4,
                name: "광안리 횟집거리",
                address: "부산 수영구 광안해변로 219",
                description: "광안대교 야경을 보며 즐기는 싱싱한 회, 부산의 대표 관광지",
                priceRange: "25,000-45,000원",
                category: "해산물",
                area: "광안리",
                specialties: ["회", "매운탕", "조개구이"]
            },
            {
                id: 5,
                name: "동래 파전거리",
                address: "부산 동래구 온천천로 51번길",
                description: "부산 3대 별미 파전의 본고장, 바삭하고 고소한 전통 파전",
                priceRange: "12,000-18,000원",
                category: "한식",
                area: "동래",
                specialties: ["동래파전", "막걸리", "전"]
            }
        ];

        // 간단한 검색 로직
        const searchTerm = message.toLowerCase();
        let relevantRestaurants = restaurants.filter(restaurant => 
            restaurant.name.toLowerCase().includes(searchTerm) ||
            restaurant.description.toLowerCase().includes(searchTerm) ||
            restaurant.area.toLowerCase().includes(searchTerm) ||
            restaurant.specialties.some(specialty => specialty.toLowerCase().includes(searchTerm))
        );

        // 검색 결과가 없으면 모든 맛집 반환
        if (relevantRestaurants.length === 0) {
            relevantRestaurants = restaurants.slice(0, 3);
        }

        // Claude API 시도
        const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
        let responseText = '';

        if (CLAUDE_API_KEY && CLAUDE_API_KEY.startsWith('sk-ant-')) {
            try {
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

                const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': CLAUDE_API_KEY,
                        'anthropic-version': '2023-06-01'
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 800,
                        system: systemPrompt,
                        messages: [
                            {
                                role: 'user',
                                content: message
                            }
                        ]
                    })
                });

                if (apiResponse.ok) {
                    const data = await apiResponse.json();
                    responseText = data.content[0].text;
                } else {
                    throw new Error('Claude API 호출 실패');
                }
            } catch (error) {
                console.log('Claude API 실패, fallback 사용:', error.message);
                responseText = generateFallbackResponse(message, relevantRestaurants);
            }
        } else {
            responseText = generateFallbackResponse(message, relevantRestaurants);
        }

        return res.json({ 
            response: responseText,
            restaurants: relevantRestaurants
        });

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ 
            error: '서버 오류가 발생했습니다.',
            details: error.message 
        });
    }
}

// Fallback 응답 생성 함수
function generateFallbackResponse(message, restaurants) {
    const restaurantList = restaurants.slice(0, 3).map(restaurant => 
        `🍜 **${restaurant.name}** (${restaurant.area})\n` +
        `📍 ${restaurant.address}\n` +
        `💰 ${restaurant.priceRange}\n` +
        `✨ ${restaurant.description}`
    ).join('\n\n');

    return `안녕하세요! 뚜기입니다 🐧\n\n` +
           `"${message}"에 대한 부산 맛집을 찾아드렸어요!\n\n` +
           `${restaurantList}\n\n` +
           `부산에 오시면 꼭 한번 가보세요! 맛있을 거예요~ 😋`;
}