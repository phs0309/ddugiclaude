const path = require('path');
const restaurants = require(path.join(process.cwd(), 'restaurants.json'));
const { createClient } = require('@supabase/supabase-js');
const { createOrUpdateSession, updateConversationTitle } = require('./conversations');

// Supabase 클라이언트 초기화
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// AI 기반 맛집 추천 시스템 
class RestaurantAI {
    constructor() {
        this.restaurants = restaurants.restaurants;
    }

    // AI가 직접 맛집을 선별하는 새로운 메서드
    async recommendRestaurants(userMessage) {
        console.log('🤖 AI 기반 맛집 추천 시작:', userMessage);
        
        try {
            // Claude AI에게 맛집 선별 요청
            const aiResponse = await this.getAIRecommendations(userMessage);
            
            if (aiResponse.isRestaurantRequest && aiResponse.recommendedRestaurants) {
                const recommendedIds = aiResponse.recommendedRestaurants;
                const recommendedRestaurants = this.getRestaurantsByIds(recommendedIds);
                
                console.log(`🎯 AI 추천: ${recommendedIds.length}개 → 실제 ${recommendedRestaurants.length}개 찾음`);
                
                return {
                    analysis: { aiReasoning: aiResponse.reasoning },
                    restaurants: recommendedRestaurants,
                    total: recommendedRestaurants.length,
                    aiGenerated: true
                };
            } else {
                console.log('🚫 맛집 요청이 아님');
                return {
                    analysis: {},
                    restaurants: [],
                    total: 0,
                    aiGenerated: false
                };
            }
        } catch (error) {
            console.error('❌ AI 추천 실패:', error);
            // 에러 시 빈 결과 반환
            return {
                analysis: {},
                restaurants: [],
                total: 0,
                aiGenerated: false
            };
        }
    }

    // Claude AI에게 맛집 추천 요청
    async getAIRecommendations(userMessage) {
        const prompt = this.buildRecommendationPrompt(userMessage);
        const response = await callClaudeAPI(prompt);
        
        try {
            // Claude 응답에서 JSON 추출
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('JSON 형식이 아님');
        } catch (error) {
            console.error('AI 응답 파싱 실패:', error);
            return { isRestaurantRequest: false };
        }
    }

    // Claude용 프롬프트 생성
    buildRecommendationPrompt(userMessage) {
        // 맛집 데이터를 간소화해서 전달 (API 토큰 제한 때문에)
        const simplifiedRestaurants = this.restaurants.slice(0, 50).map(r => ({
            id: r.id,
            name: r.name,
            area: r.area,
            category: r.category,
            description: r.description.substring(0, 100),
            specialties: r.specialties?.slice(0, 3) || [],
            rating: r.rating,
            priceRange: r.priceRange
        }));

        return `당신은 부산 맛집 전문가입니다. 사용자의 요청을 분석하고 적합한 맛집을 추천해주세요.

사용자 요청: "${userMessage}"

부산 맛집 데이터:
${JSON.stringify(simplifiedRestaurants, null, 2)}

다음 형식으로만 답변해주세요:
{
  "isRestaurantRequest": true/false,
  "reasoning": "추천 이유 (한글 50자 이내)",
  "recommendedRestaurants": ["맛집ID1", "맛집ID2", "맛집ID3"]
}

조건:
1. 사용자가 맛집/음식점을 찾는 요청인지 판단
2. 적합한 맛집 최대 5개의 ID만 추천
3. 완벽히 맞지 않아도 가장 유사한 것 추천
4. JSON 형식 외의 다른 설명은 하지 마세요`;
    }

    // ID로 맛집 찾기
    getRestaurantsByIds(ids) {
        return ids.map(id => 
            this.restaurants.find(r => r.id === id)
        ).filter(Boolean);
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

        // AI 기반 맛집 추천 시스템
        const recommendations = await restaurantAI.recommendRestaurants(message);
        
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

        // 맛집 추천 여부 확인 (AI가 판단)
        const hasRestaurantRecommendation = recommendations.restaurants.length > 0;
        
        // 대화 세션 관리 및 저장
        if (sessionId && userId) {
            try {
                // 대화 세션 생성 또는 업데이트
                await createOrUpdateSession(sessionId, userId, true);
                
                // 사용자 메시지 저장
                await saveConversationMessage(sessionId, userId, 'user', message, 'chat');
                
                // AI 응답 저장
                await saveConversationMessage(sessionId, userId, 'assistant', aiResponse, hasRestaurantRecommendation ? 'recommendation' : 'chat');
                
                // 세션의 메시지가 3개 이상이 되면 AI로 제목 생성
                const { data: messageCount } = await supabase
                    .from('conversations')
                    .select('id', { count: 'exact' })
                    .eq('session_id', sessionId);
                
                if (messageCount && messageCount.length >= 4) { // 사용자 2개 + AI 2개 = 4개 이상
                    // AI 제목 생성 (비동기로 실행, 응답 차단 안함)
                    updateConversationTitle(sessionId)
                        .catch(err => console.error('제목 업데이트 실패:', err));
                }
                
            } catch (error) {
                console.error('대화 관리 실패:', error);
                // 에러가 발생해도 메시지 저장은 시도
                saveConversationMessage(sessionId, userId, 'user', message, 'chat')
                    .catch(err => console.error('사용자 메시지 저장 실패:', err));
                saveConversationMessage(sessionId, userId, 'assistant', aiResponse, hasRestaurantRecommendation ? 'recommendation' : 'chat')
                    .catch(err => console.error('AI 응답 저장 실패:', err));
            }
        }

        // 응답 전송
        const response = {
            message: aiResponse,
            restaurants: recommendations.restaurants,
            analysis: recommendations.analysis,
            type: hasRestaurantRecommendation ? 'recommendation' : 'chat',
            aiGenerated: aiGenerated,
            sessionId: sessionId,
            userId: userId,
            // 디버그 정보 (AI 기반)
            debug: {
                userMessage: message,
                hasRestaurantRecommendation,
                totalCandidates: recommendations.total,
                aiReasoning: recommendations.analysis?.aiReasoning,
                restaurantCount: recommendations.restaurants?.length || 0,
                aiRecommendationGenerated: recommendations.aiGenerated
            }
        };
        
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