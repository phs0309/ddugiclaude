const path = require('path');
const restaurants = require(path.join(process.cwd(), 'restaurants.json'));

// Restaurant AI 로직을 Vercel 함수에 맞게 구현
class RestaurantAI {
    constructor() {
        this.restaurants = restaurants.restaurants;
    }

    analyzeUserMessage(message) {
        const lowerMessage = message.toLowerCase();
        
        // 지역 키워드 매핑
        const areaMap = {
            '해운대': ['해운대', '해운대구', '센텀'],
            '서면': ['서면', '부산진구'],
            '광안리': ['광안리', '수영구'],
            '남포동': ['남포동', '중구', '자갈치'],
            '동래': ['동래', '동래구', '온천'],
            '기장': ['기장', '기장군'],
            '부산대': ['부산대', '금정구', '장전'],
            '태종대': ['태종대', '영도구', '영도'],
            '감천': ['감천', '사하구', '감천문화마을']
        };

        // 음식 카테고리 키워드
        const categoryMap = {
            '한식': ['한식', '국밥', '밀면', '파전', '족발', '보쌈'],
            '해산물': ['해산물', '회', '횟집', '아구찜', '곰장어', '멸치'],
            '간식': ['간식', '호떡', '씨앗호떡', '디저트'],
            '카페': ['카페', '커피', '아메리카노', '케이크']
        };

        // 특정 음식 키워드
        const foodKeywords = [
            '돼지국밥', '밀면', '회', '아구찜', '곰장어', '파전', 
            '족발', '보쌈', '멸치국수', '호떡', '커피'
        ];

        const analysis = {
            area: null,
            category: null,
            food: null,
            priceRange: null,
            rating: null
        };

        // 지역 분석 (매칭된 키워드들을 모두 저장)
        for (const [area, keywords] of Object.entries(areaMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                analysis.area = area;
                analysis.areaKeywords = keywords; // 필터링에 사용할 키워드들
                break;
            }
        }

        // 카테고리 분석
        for (const [category, keywords] of Object.entries(categoryMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                analysis.category = category;
                break;
            }
        }

        // 특정 음식 키워드
        for (const food of foodKeywords) {
            if (lowerMessage.includes(food)) {
                analysis.food = food;
                break;
            }
        }

        // 가격대 분석
        if (lowerMessage.includes('저렴') || lowerMessage.includes('싸') || lowerMessage.includes('학생')) {
            analysis.priceRange = 'low';
        } else if (lowerMessage.includes('비싸') || lowerMessage.includes('고급') || lowerMessage.includes('특별')) {
            analysis.priceRange = 'high';
        }

        // 평점 관련
        if (lowerMessage.includes('맛있') || lowerMessage.includes('유명') || lowerMessage.includes('평점')) {
            analysis.rating = 4.0;
        }

        return analysis;
    }

    recommendRestaurants(userMessage) {
        const analysis = this.analyzeUserMessage(userMessage);
        let candidates = [...this.restaurants];

        // 지역 필터링
        if (analysis.area && analysis.areaKeywords) {
            candidates = candidates.filter(restaurant => {
                return analysis.areaKeywords.some(keyword => 
                    restaurant.address.includes(keyword) || 
                    restaurant.area.includes(keyword)
                );
            });
        }

        // 카테고리 필터링
        if (analysis.category) {
            candidates = candidates.filter(restaurant => 
                restaurant.category === analysis.category
            );
        }

        // 특정 음식 필터링
        if (analysis.food) {
            candidates = candidates.filter(restaurant => 
                restaurant.specialties.some(specialty => 
                    specialty.includes(analysis.food)
                ) || restaurant.name.includes(analysis.food) ||
                restaurant.description.includes(analysis.food)
            );
        }

        // 가격대 필터링
        if (analysis.priceRange === 'low') {
            candidates = candidates.filter(restaurant => {
                const maxPrice = parseInt(restaurant.priceRange.split('-')[1]);
                return maxPrice <= 15000;
            });
        } else if (analysis.priceRange === 'high') {
            candidates = candidates.filter(restaurant => {
                const maxPrice = parseInt(restaurant.priceRange.split('-')[1]);
                return maxPrice >= 30000;
            });
        }

        // 평점 필터링
        if (analysis.rating) {
            candidates = candidates.filter(restaurant => 
                restaurant.rating >= analysis.rating
            );
        }

        // 평점순으로 정렬
        candidates.sort((a, b) => {
            if (b.rating !== a.rating) {
                return b.rating - a.rating;
            }
            return b.reviewCount - a.reviewCount;
        });

        return {
            analysis,
            restaurants: candidates.slice(0, 5),
            total: candidates.length
        };
    }

    getRandomRecommendations(count = 3) {
        const shuffled = [...this.restaurants].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }
}

// Claude API 호출 함수
async function callClaudeAPI(prompt) {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.claude_api_key;
    
    if (!apiKey) {
        console.log('❌ Claude API 키가 설정되지 않음');
        return null;
    }

    console.log('🤖 Claude API 호출 시작...');
    
    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            })
        });

        console.log(`📡 Claude API 응답: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('❌ Claude API 오류 상세:', errorText);
            return null;
        }

        const data = await response.json();
        const aiResponse = data.content[0]?.text;
        
        if (aiResponse) {
            console.log('✅ Claude AI 응답 성공');
            return aiResponse;
        } else {
            console.log('❌ Claude API 응답 형식 오류:', data);
            return null;
        }

    } catch (error) {
        console.log('❌ Claude API 호출 실패:', error.message);
        return null;
    }
}


// Claude AI 프롬프트 생성
function generateClaudePrompt(userMessage, restaurants) {
    const basePrompt = `너는 "뚜기"라는 이름의 부산 토박이 맛집 가이드야. 다음과 같은 캐릭터로 대답해줘:

🐧 캐릭터 설정:
- 이름: 뚜기 (부산의 상징 갈매기에서 따온 애칭)
- 나이: 30대 중반, 부산에서 태어나고 자란 토박이
- 성격: 털털하고 친근하며, 맛집에 대한 열정이 넘침
- 말투: 부산 사투리를 자연스럽게 사용하되 너무 과하지 않게
- 특징: 항상 이모지를 적절히 사용하고, 개인적인 경험담을 섞어서 설명

💬 말투 특징:
- "~다이가", "~아이가", "~해봐라", "마!" 자주 사용
- "진짜", "완전", "개꿀" 등의 강조 표현
- "내가 먹어봤는데", "여기 진짜 맛있어" 등 개인 경험 언급

🍽️ 사용자 메시지: "${userMessage}"`;

    if (restaurants && restaurants.length > 0) {
        const restaurantInfo = restaurants.slice(0, 3).map((r, idx) => 
            `${idx + 1}. ${r.name} (${r.area})\n   📍 ${r.address}\n   ⭐ ${r.rating}/5 (${r.reviewCount}개 리뷰)\n   🍽️ ${r.description}`
        ).join('\n\n');

        return `${basePrompt}

🏪 추천 맛집 데이터:
${restaurantInfo}

위 맛집들을 뚜기의 캐릭터로 2-3문장 정도 추천해줘. 구체적인 이름이나 주소는 카드에 나오니까 반복하지 말고, 뚜기만의 개성있는 소개로 말해줘. 반드시 이모지도 포함해서 친근하게!`;
    } else {
        return `${basePrompt}

사용자가 맛집과 관련된 질문을 했지만 조건에 맞는 맛집을 찾지 못했거나, 일반적인 대화를 하고 있어. 뚜기의 캐릭터로 친근하게 응답해줘. 맛집을 못 찾았다면 다른 조건으로 물어보라고 하고, 일반 대화라면 자연스럽게 맛집 얘기로 유도해봐. 2-3문장 정도로 이모지 포함해서!`;
    }
}

// Vercel 서버리스 함수
module.exports = async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { message } = req.body || {};

    if (!message) {
        return res.status(400).json({ 
            error: '메시지를 입력해주세요.' 
        });
    }

    console.log(`💬 사용자: "${message}"`);

    try {
        console.log('🔄 RestaurantAI 인스턴스 생성 시작...');
        const restaurantAI = new RestaurantAI();
        console.log('✅ RestaurantAI 인스턴스 생성 완료');

        // 위치 데이터 언급 여부 체크
        const locationKeywords = [
            '해운대', '광안리', '서면', '남포동', '중구', '동구', '서구', '영도', '부산진구', 
            '동래구', '남구', '북구', '사상구', '금정구', '강서구', '연제구', '수영구', '사하구',
            '기장', '양산', '온천장', '센텀', '자갈치', '국제시장', '태종대', '용두산', 
            '부평', '덕천', '화명', '구포', '사직', '연산', '거제', '교대', '부경대', '동아대'
        ];
        
        const hasLocationMention = locationKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );

        // 위치 언급이 있을 때만 맛집 추천
        let recommendations = { restaurants: [], analysis: {}, total: 0, hasLocationMention };
        if (hasLocationMention) {
            recommendations = restaurantAI.recommendRestaurants(message);
            recommendations.hasLocationMention = hasLocationMention; // 추가
        }
        
        // 항상 Claude AI로 응답 생성
        const claudePrompt = generateClaudePrompt(message, recommendations.restaurants);
        let aiResponse = await callClaudeAPI(claudePrompt);

        console.log(`🤖 위치 언급: ${hasLocationMention}, 추천 맛집: ${recommendations.restaurants.length}개`);

        // AI 응답이 없으면 에러 응답
        if (!aiResponse) {
            return res.status(500).json({
                message: "AI 서버 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.",
                restaurants: [],
                type: 'error',
                aiGenerated: false
            });
        }

        // 위치 언급이 있을 때만 맛집 카드 전송
        res.json({
            message: aiResponse,
            restaurants: hasLocationMention ? recommendations.restaurants : [],
            analysis: hasLocationMention ? recommendations.analysis : {},
            type: hasLocationMention ? 'recommendation' : 'chat',
            aiGenerated: true
        });

    } catch (error) {
        console.error('❌ 서버 오류 발생:', error);
        console.error('❌ 오류 스택:', error.stack);
        console.error('❌ 사용자 메시지:', message);
        res.status(500).json({
            message: `서버 오류가 발생했습니다: ${error.message}`,
            restaurants: [],
            type: 'error',
            debug: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};