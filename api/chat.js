const restaurants = require('../restaurants.json');

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

        // 지역 분석
        for (const [area, keywords] of Object.entries(areaMap)) {
            if (keywords.some(keyword => lowerMessage.includes(keyword))) {
                analysis.area = area;
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
        if (analysis.area) {
            candidates = candidates.filter(restaurant => {
                return restaurant.address.includes(analysis.area) || 
                       restaurant.area.includes(analysis.area);
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
    const apiKey = process.env.claude_api_key;
    
    if (!apiKey) {
        console.log('⚠️ Claude API 키가 없어서 AI 응답 생략');
        return null;
    }

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

        if (!response.ok) {
            console.log('⚠️ Claude API 오류, 기본 응답 사용');
            return null;
        }

        const data = await response.json();
        return data.content[0].text;

    } catch (error) {
        console.log('⚠️ Claude API 호출 실패:', error.message);
        return null;
    }
}

// AI 응답 생성
function generateAIResponse(userMessage, recommendations) {
    const { analysis, restaurants, total } = recommendations;
    
    if (restaurants.length === 0) {
        return "아이고, 조건에 맞는 맛집을 못 찾겠네요 😅 다른 지역이나 음식으로 다시 물어보세요!";
    }

    let responseMessage = "부산 맛집 추천해드릴게요! 🍽️\n\n";
    
    if (analysis.area) {
        responseMessage += `${analysis.area} 지역에서 `;
    }
    if (analysis.food) {
        responseMessage += `${analysis.food} 맛집으로 `;
    } else if (analysis.category) {
        responseMessage += `${analysis.category} 맛집으로 `;
    }
    
    responseMessage += `${restaurants.length}곳을 추천드려요!\n\n`;
    
    // 추천 맛집 간단 소개
    if (restaurants.length > 0) {
        const topRestaurant = restaurants[0];
        responseMessage += `특히 "${topRestaurant.name}"이 평점 ${topRestaurant.rating}점으로 인기가 높아요. `;
        responseMessage += `${topRestaurant.description.substring(0, 50)}... `;
        responseMessage += `아래 카드에서 더 자세한 정보를 확인해보세요! 👇`;
    }

    return responseMessage;
}

// Claude AI 프롬프트 생성
function generateClaudePrompt(userMessage, restaurants) {
    const restaurantInfo = restaurants.slice(0, 3).map((r, idx) => 
        `${idx + 1}. ${r.name} (${r.area})\n   📍 ${r.address}\n   ⭐ ${r.rating}/5 (${r.reviewCount}개 리뷰)\n   🍽️ ${r.description}`
    ).join('\n\n');

    return `너는 부산 현지인이고 맛집 전문가야. 부산 사투리를 조금 써서 친근하게 대답해줘.

사용자 요청: "${userMessage}"

실제 부산 맛집 데이터:
${restaurantInfo}

위 맛집들을 바탕으로 2-3문장 정도로 간단하고 친근하게 추천해줘.
맛집 카드는 따로 보여주니까 구체적인 이름이나 주소는 반복하지 말고, 전체적인 소개만 해줘.
부산 사투리 ("~다이가", "~아이가", "~해봐라")를 자연스럽게 써서 친근하게 말해줘.`;
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
        const restaurantAI = new RestaurantAI();

        // 인사말이나 일반 대화 체크
        const lowerMessage = message.toLowerCase();
        const greetings = ['안녕', '하이', '반갑', '처음'];
        const isGreeting = greetings.some(greeting => lowerMessage.includes(greeting));

        if (isGreeting) {
            return res.json({
                message: "안녕하세요! 부산 맛집 추천 AI입니다 🍽️\n\nJSON 데이터 기반으로 정확한 맛집만 추천해드려요! 어떤 맛집을 찾고 계신가요?",
                restaurants: restaurantAI.getRandomRecommendations(3),
                type: 'greeting'
            });
        }

        // AI 맛집 추천
        const recommendations = restaurantAI.recommendRestaurants(message);
        
        // Claude AI로 자연스러운 응답 생성 시도
        let aiResponse = null;
        if (recommendations.restaurants.length > 0) {
            const claudePrompt = generateClaudePrompt(message, recommendations.restaurants);
            aiResponse = await callClaudeAPI(claudePrompt);
        }

        // AI 응답이 없으면 기본 응답 사용
        const finalResponse = aiResponse || generateAIResponse(message, recommendations);

        console.log(`🤖 추천 맛집: ${recommendations.restaurants.length}개`);

        res.json({
            message: finalResponse,
            restaurants: recommendations.restaurants,
            analysis: recommendations.analysis,
            type: 'recommendation',
            aiGenerated: !!aiResponse
        });

    } catch (error) {
        console.error('❌ 오류:', error);
        res.status(500).json({
            message: "죄송합니다. 오류가 발생했어요. 다시 시도해주세요! 😅",
            restaurants: [],
            type: 'error'
        });
    }
};