const path = require('path');
const restaurants = require(path.join(process.cwd(), 'restaurants.json'));
const { createClient } = require('@supabase/supabase-js');

// Supabase 클라이언트 초기화
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

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

// 대화 저장 함수
async function saveConversationMessage(sessionId, userId, role, content, messageType = 'chat') {
    try {
        const { error } = await supabase
            .from('conversations')
            .insert({
                session_id: sessionId,
                user_id: userId,
                role: role,
                content: content,
                message_type: messageType
            });

        if (error) {
            console.error('💾 대화 저장 실패:', error);
        } else {
            console.log('💾 대화 저장 성공:', { sessionId, role, messageType });
        }
    } catch (error) {
        console.error('💾 대화 저장 중 에러:', error);
    }
}

// 대화 히스토리 불러오기 함수
async function getConversationHistory(sessionId, limit = 10) {
    try {
        const { data, error } = await supabase
            .from('conversations')
            .select('role, content, created_at')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('📖 대화 히스토리 불러오기 실패:', error);
            return [];
        }

        console.log('📖 대화 히스토리 불러오기 성공:', data?.length || 0, '개');
        return data || [];
    } catch (error) {
        console.error('📖 대화 히스토리 불러오기 중 에러:', error);
        return [];
    }
}

// Claude API Error 클래스 정의
class ClaudeAPIError extends Error {
    constructor(type, message, statusCode, requestId = null) {
        super(message);
        this.name = 'ClaudeAPIError';
        this.type = type;
        this.statusCode = statusCode;
        this.requestId = requestId;
    }
}

// 재시도 로직을 위한 유틸리티 함수
async function retryWithExponentialBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            // 재시도 가능한 에러인지 확인
            const retryableErrors = ['rate_limit_error', 'overloaded_error', 'api_error'];
            
            if (i === maxRetries - 1 || 
                (error instanceof ClaudeAPIError && !retryableErrors.includes(error.type))) {
                throw error;
            }
            
            // 지수 백오프 적용
            const delay = initialDelay * Math.pow(2, i);
            console.log(`⏳ 재시도 ${i + 1}/${maxRetries}, ${delay}ms 대기...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Claude API 호출 함수 - 개선된 버전
async function callClaudeAPI(prompt) {
    // API 키 확인
    const apiKey = process.env.claude_api_key || process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        console.error('❌ Claude API 키가 설정되지 않음');
        throw new ClaudeAPIError(
            'authentication_error',
            'Claude API 키가 설정되지 않았습니다. 환경 변수를 확인해주세요.',
            401
        );
    }

    // API 키 형식 검증
    if (!apiKey.startsWith('sk-ant-')) {
        console.error('❌ Claude API 키 형식이 올바르지 않음');
        throw new ClaudeAPIError(
            'authentication_error',
            'Claude API 키 형식이 올바르지 않습니다.',
            401
        );
    }

    console.log('🤖 Claude API 호출 시작...');
    console.log('🔑 API 키 확인: 설정됨 (길이:', apiKey.length + ')');
    
    const makeRequest = async () => {
        try {
            // 요청 본문 준비
            const requestBody = {
                model: 'claude-3-5-haiku-20241022',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: prompt
                }],
                temperature: 0.7,
                system: "너는 부산 맛집을 추천하는 친근한 AI 어시스턴트야."
            };
            
            console.log('📤 Claude API 요청 시작...');
            
            // API 호출 - 타임아웃 설정 (30초)
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true' // CORS 이슈 해결
                },
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            console.log(`📡 Claude API 응답: ${response.status} ${response.statusText}`);
            
            // 응답 처리
            const responseText = await response.text();
            let responseData;
            
            try {
                responseData = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ 응답 파싱 실패:', responseText);
                throw new ClaudeAPIError(
                    'api_error',
                    'API 응답을 파싱할 수 없습니다.',
                    500
                );
            }

            // 에러 응답 처리
            if (!response.ok) {
                const errorType = responseData.error?.type || 'unknown_error';
                const errorMessage = responseData.error?.message || '알 수 없는 오류가 발생했습니다.';
                const requestId = responseData.request_id || null;
                
                console.error(`❌ Claude API 오류:`, {
                    type: errorType,
                    message: errorMessage,
                    status: response.status,
                    requestId: requestId
                });

                // 에러 타입에 따른 처리
                switch (response.status) {
                    case 401:
                        throw new ClaudeAPIError('authentication_error', 
                            'API 키 인증에 실패했습니다. 키를 확인해주세요.', 401, requestId);
                    case 403:
                        throw new ClaudeAPIError('permission_error', 
                            'API 키에 필요한 권한이 없습니다.', 403, requestId);
                    case 404:
                        throw new ClaudeAPIError('not_found_error', 
                            '요청한 리소스를 찾을 수 없습니다.', 404, requestId);
                    case 413:
                        throw new ClaudeAPIError('request_too_large', 
                            '요청 크기가 너무 큽니다.', 413, requestId);
                    case 429:
                        throw new ClaudeAPIError('rate_limit_error', 
                            'API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.', 429, requestId);
                    case 500:
                        throw new ClaudeAPIError('api_error', 
                            'Claude API 내부 오류가 발생했습니다.', 500, requestId);
                    case 529:
                        throw new ClaudeAPIError('overloaded_error', 
                            'API가 일시적으로 과부하 상태입니다.', 529, requestId);
                    default:
                        throw new ClaudeAPIError(errorType, errorMessage, response.status, requestId);
                }
            }

            // 성공 응답 처리
            const aiResponse = responseData.content?.[0]?.text;
            
            if (!aiResponse) {
                console.error('❌ 응답 형식 오류:', responseData);
                throw new ClaudeAPIError(
                    'api_error',
                    'API 응답 형식이 올바르지 않습니다.',
                    500
                );
            }
            
            console.log('✅ Claude AI 응답 성공');
            return aiResponse;

        } catch (error) {
            // AbortController 타임아웃
            if (error.name === 'AbortError') {
                console.error('❌ API 요청 타임아웃');
                throw new ClaudeAPIError(
                    'timeout_error',
                    'API 요청이 시간 초과되었습니다.',
                    408
                );
            }
            
            // 네트워크 오류
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('❌ 네트워크 오류:', error.message);
                throw new ClaudeAPIError(
                    'network_error',
                    '네트워크 연결에 실패했습니다.',
                    0
                );
            }
            
            // ClaudeAPIError는 그대로 전달
            if (error instanceof ClaudeAPIError) {
                throw error;
            }
            
            // 기타 오류
            console.error('❌ 예상치 못한 오류:', error);
            throw new ClaudeAPIError(
                'unknown_error',
                error.message || '알 수 없는 오류가 발생했습니다.',
                500
            );
        }
    };
    
    // 재시도 로직 적용
    try {
        return await retryWithExponentialBackoff(makeRequest, 3, 1000);
    } catch (error) {
        // 최종 실패
        console.error('❌ Claude API 호출 최종 실패:', error.message);
        throw error;
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

// 폴백 응답 생성 함수
function generateFallbackResponse(userMessage, restaurants) {
    const fallbackResponses = {
        greeting: [
            "어이가! 부산 맛집 찾으러 왔나? 🦅 내가 뚜기다이가! 어느 동네 맛집 알려줄까?",
            "마! 반갑다 🙌 부산 토박이 뚜기가 맛집 추천해준다이가! 어디 가고 싶노?"
        ],
        recommendation: [
            "아이고 맛집이가! 😋 여기는 진짜 내가 자주 가는 곳인데, 완전 꿀맛이라카이! 함 가봐라~",
            "오~ 여기 아나? 🍜 내가 맨날 가는 단골집이라! 진짜 맛있다이가, 가면 후회 안 한다!"
        ],
        notFound: [
            "아이고... 그 조건은 좀 어렵네 😅 다른 동네나 음식으로 한번 더 물어봐라이!",
            "그런 맛집은 좀 찾기 힘드네... 🤔 혹시 다른 지역이나 메뉴로 추천해줄까?"
        ],
        general: [
            "맛집 얘기하니까 배고프네 마! 😋 어느 동네 맛집 궁금한가?",
            "부산은 맛집 천국이라카이! 🌊 해운대, 서면, 광안리... 어디 갈래?"
        ]
    };

    // 메시지 타입 판별
    const lowerMessage = userMessage.toLowerCase();
    let responseType = 'general';
    
    if (lowerMessage.match(/안녕|하이|hello|hi/)) {
        responseType = 'greeting';
    } else if (restaurants && restaurants.length > 0) {
        responseType = 'recommendation';
    } else if (lowerMessage.match(/맛집|추천|어디/)) {
        responseType = 'notFound';
    }

    const responses = fallbackResponses[responseType];
    return responses[Math.floor(Math.random() * responses.length)];
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
        return res.status(405).json({ 
            error: 'Method not allowed',
            message: '허용되지 않은 요청 방식입니다.' 
        });
    }

    const { message, sessionId, userId } = req.body || {};

    if (!message) {
        return res.status(400).json({ 
            error: 'bad_request',
            message: '메시지를 입력해주세요.',
            type: 'error'
        });
    }

    console.log(`💬 사용자: "${message}"`);

    try {
        // RestaurantAI 인스턴스 생성
        const restaurantAI = new RestaurantAI();

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
        let recommendations = { restaurants: [], analysis: {}, total: 0 };
        if (hasLocationMention) {
            recommendations = restaurantAI.recommendRestaurants(message);
        }
        
        let aiResponse;
        let aiGenerated = false;
        
        try {
            // Claude AI로 응답 생성 시도
            const claudePrompt = generateClaudePrompt(message, recommendations.restaurants);
            aiResponse = await callClaudeAPI(claudePrompt);
            aiGenerated = true;
            console.log('✅ Claude AI 응답 생성 성공');
            
        } catch (error) {
            console.error('⚠️ Claude API 실패, 폴백 응답 사용:', error.message);
            
            // 에러 타입에 따른 사용자 친화적 메시지
            let userErrorMessage;
            
            if (error instanceof ClaudeAPIError) {
                switch (error.type) {
                    case 'authentication_error':
                        userErrorMessage = "🔑 API 인증 문제가 발생했어... 관리자한테 연락해봐라!";
                        break;
                    case 'rate_limit_error':
                        userErrorMessage = "😅 지금 너무 바빠서... 조금 있다가 다시 물어봐라!";
                        break;
                    case 'overloaded_error':
                        userErrorMessage = "🔥 서버가 좀 바쁜가보네... 잠시만 기다려봐라!";
                        break;
                    case 'timeout_error':
                        userErrorMessage = "⏰ 응답이 너무 늦네... 다시 한번 물어봐줄래?";
                        break;
                    case 'network_error':
                        userErrorMessage = "📡 인터넷 연결이 불안정한가봐... 다시 시도해봐라!";
                        break;
                    default:
                        userErrorMessage = "😵 뭔가 문제가 생겼네... 다시 물어봐줄래?";
                }
                
                // 개발 환경에서는 상세 에러 포함
                if (process.env.NODE_ENV === 'development') {
                    userErrorMessage += `\n[디버그: ${error.type} - ${error.message}]`;
                }
            } else {
                userErrorMessage = "😵 잠깐 문제가 생겼는데... 다시 물어봐줄래?";
            }
            
            // 폴백 응답 사용
            aiResponse = userErrorMessage + "\n\n" + generateFallbackResponse(message, recommendations.restaurants);
            aiGenerated = false;
        }

        // 대화 저장 (비동기로 실행, 응답 차단하지 않음)
        if (sessionId) {
            // 사용자 메시지 저장
            saveConversationMessage(sessionId, userId, 'user', message, 'chat')
                .catch(err => console.error('사용자 메시지 저장 실패:', err));
            
            // AI 응답 저장
            saveConversationMessage(sessionId, userId, 'assistant', aiResponse, hasLocationMention ? 'recommendation' : 'chat')
                .catch(err => console.error('AI 응답 저장 실패:', err));
        }

        // 응답 전송
        const response = {
            message: aiResponse,
            restaurants: hasLocationMention ? recommendations.restaurants : [],
            analysis: hasLocationMention ? recommendations.analysis : {},
            type: hasLocationMention ? 'recommendation' : 'chat',
            aiGenerated: aiGenerated,
            sessionId: sessionId,
            userId: userId
        };
        
        // 개발 환경에서는 디버그 정보 추가
        if (process.env.NODE_ENV === 'development') {
            response.debug = {
                hasLocationMention,
                totalCandidates: recommendations.total,
                apiKeyConfigured: !!process.env.claude_api_key
            };
        }
        
        console.log(`📤 응답 전송: ${response.type}, AI생성: ${response.aiGenerated}`);
        res.json(response);

    } catch (error) {
        console.error('❌ 서버 오류:', error);
        
        // 예상치 못한 서버 오류
        res.status(500).json({
            message: "아이고... 서버에 문제가 생겼네 😵 잠시 후에 다시 해봐라!",
            restaurants: [],
            type: 'error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined,
            aiGenerated: false
        });
    }
};