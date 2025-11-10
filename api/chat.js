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

// AI 응답 생성 (뚜기 캐릭터)
function generateAIResponse(userMessage, recommendations) {
    const { analysis, restaurants, total } = recommendations;
    
    const dduggiResponses = {
        noResults: [
            "마! 아쉽다이가... 조건에 딱 맞는 맛집을 못 찾겠네 😅 다른 지역이나 음식으로 다시 말해봐라!",
            "이런, 내가 아는 맛집 중에는 없네... 🤔 혹시 다른 음식이나 지역으로 물어봐라!",
            "앗, 그 조건으로는 추천할 곳이 없다이가 😓 조금 다르게 말해보면 좋은 곳 알려줄게!"
        ],
        greetings: [
            "마! 뚜기다이가! 🐧 부산 맛집은 나한테 맡겨라! 뭔 맛있는 거 찾고 있노?",
            "안녕하세요! 부산 토박이 뚜기입니다 😊 어떤 맛집 찾고 계신가요? 내가 다 아는데!",
            "어서와라! 🙌 뚜기가 부산 맛집 다 알려줄게! 어디 가고 싶은지 말해봐라!"
        ],
        casual: [
            "뚜기가 도와줄게! 🐧 뭔 얘기할까?",
            "마! 좋다이가 😄 또 뭔 궁금한 거 있나?",
            "부산 살이 어때? 🌊 맛집 얘기면 언제든 말해라!"
        ]
    };

    if (restaurants.length === 0) {
        const randomResponse = dduggiResponses.noResults[Math.floor(Math.random() * dduggiResponses.noResults.length)];
        return randomResponse;
    }

    // 뚜기 스타일 응답 생성
    let responseMessage = "";
    
    // 시작 인사
    const starters = [
        "마! 좋은 곳들 찾았다이가! 🍽️",
        "어이구, 맛있는 곳들이 있네! 😋",
        "완전 좋은 맛집들 추천해줄게! 👌"
    ];
    responseMessage += starters[Math.floor(Math.random() * starters.length)] + "\n\n";
    
    // 지역/음식 언급
    if (analysis.area) {
        responseMessage += `${analysis.area}에서 `;
    }
    if (analysis.food) {
        responseMessage += `${analysis.food} 맛집 `;
    } else if (analysis.category) {
        responseMessage += `${analysis.category} 맛집 `;
    }
    
    responseMessage += `${restaurants.length}곳 골라줬어! `;
    
    // 뚜기만의 코멘트
    const comments = [
        "내가 다 먹어봤는데 진짜 맛있어!",
        "여기들 완전 개꿀이야!",
        "부산 사람들이 진짜 많이 가는 곳들이다이가!",
        "관광객들한테는 비밀인데... 진짜 맛집들이야!"
    ];
    responseMessage += comments[Math.floor(Math.random() * comments.length)] + "\n\n";
    
    // 맛집 간단 소개
    if (restaurants.length > 0) {
        const topRestaurant = restaurants[0];
        const praises = [
            "특히 여기가 평점도 높고 진짜 유명해!",
            "이 집은 내가 자주 가는 곳인데 완전 추천!",
            "여기 사장님도 완전 친절하고 맛도 끝내줘!",
            "이 집은 부산 사람들 사이에서 완전 핫플이야!"
        ];
        responseMessage += praises[Math.floor(Math.random() * praises.length)];
        responseMessage += " 아래 카드 눌러서 자세히 봐라! 🔽";
    }

    return responseMessage;
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
        const restaurantAI = new RestaurantAI();

        // 모든 메시지를 Claude API로 처리


        // AI 맛집 추천
        const recommendations = restaurantAI.recommendRestaurants(message);
        
        // 항상 Claude AI로 응답 생성
        const claudePrompt = generateClaudePrompt(message, recommendations.restaurants);
        let aiResponse = await callClaudeAPI(claudePrompt);

        // AI 응답이 없으면 폴백 응답 사용
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