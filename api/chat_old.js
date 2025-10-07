import visitBusanService from './visitBusanService.js';
import ConversationAnalyzer from './conversationAnalyzer.js';

// 간단한 in-memory rate limiting (프로덕션에서는 Redis 사용 권장)
const requestCounts = new Map();
const RATE_LIMIT = 10; // 분당 10회
const WINDOW_MS = 60 * 1000; // 1분

// 대화 기록 메모리 저장소 (세션별)
const conversationMemory = new Map();
const MAX_MEMORY_ENTRIES = 100; // 최대 세션 수
const MAX_CONVERSATION_LENGTH = 20; // 세션당 최대 대화 수
const MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간마다 정리

// AI 대화 분석기 초기화
const conversationAnalyzer = new ConversationAnalyzer();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    // 오래된 요청 제거
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false; // Rate limit 초과
    }
    
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    return true;
}

// 메모리 정리 함수
function cleanupMemory() {
    const now = Date.now();
    for (const [sessionId, sessionData] of conversationMemory.entries()) {
        // 1시간 이상 비활성 세션 제거
        if (now - sessionData.lastActivity > MEMORY_CLEANUP_INTERVAL) {
            conversationMemory.delete(sessionId);
        }
    }
    
    // 최대 세션 수 초과시 오래된 것부터 제거
    if (conversationMemory.size > MAX_MEMORY_ENTRIES) {
        const sessions = Array.from(conversationMemory.entries())
            .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
        
        const toRemove = sessions.slice(0, conversationMemory.size - MAX_MEMORY_ENTRIES);
        toRemove.forEach(([sessionId]) => conversationMemory.delete(sessionId));
    }
}

// 대화 기록 관리 함수
function getConversationHistory(sessionId) {
    if (!conversationMemory.has(sessionId)) {
        conversationMemory.set(sessionId, {
            messages: [],
            userPreferences: {
                preferredAreas: [],
                preferredCategories: [],
                priceRange: null,
                lastVisitedArea: null
            },
            lastActivity: Date.now()
        });
    }
    
    const sessionData = conversationMemory.get(sessionId);
    sessionData.lastActivity = Date.now();
    return sessionData;
}

function addToConversationHistory(sessionId, message, role) {
    const sessionData = getConversationHistory(sessionId);
    
    sessionData.messages.push({
        role: role,
        content: message,
        timestamp: Date.now()
    });
    
    // 대화 길이 제한
    if (sessionData.messages.length > MAX_CONVERSATION_LENGTH) {
        sessionData.messages = sessionData.messages.slice(-MAX_CONVERSATION_LENGTH);
    }
    
    // 사용자 선호도 분석 및 업데이트
    if (role === 'user') {
        updateUserPreferences(sessionData, message);
    }
}

function updateUserPreferences(sessionData, message) {
    const lowerMessage = message.toLowerCase();
    
    // 지역 선호도 업데이트
    const areas = ['해운대', '서면', '남포동', '광안리', '부산대', '강서구', '동래', '기장', '센텀'];
    areas.forEach(area => {
        if (lowerMessage.includes(area)) {
            if (!sessionData.userPreferences.preferredAreas.includes(area)) {
                sessionData.userPreferences.preferredAreas.push(area);
            }
            sessionData.userPreferences.lastVisitedArea = area;
        }
    });
    
    // 카테고리 선호도 업데이트
    const categories = ['한식', '해산물', '분식', '카페', '양식', '중식', '일식', '치킨', '피자'];
    categories.forEach(category => {
        if (lowerMessage.includes(category)) {
            if (!sessionData.userPreferences.preferredCategories.includes(category)) {
                sessionData.userPreferences.preferredCategories.push(category);
            }
        }
    });
    
    // 가격 선호도 업데이트
    if (lowerMessage.includes('저렴') || lowerMessage.includes('가성비') || lowerMessage.includes('싸')) {
        sessionData.userPreferences.priceRange = 'budget';
    } else if (lowerMessage.includes('비싸') || lowerMessage.includes('고급') || lowerMessage.includes('특별한')) {
        sessionData.userPreferences.priceRange = 'premium';
    }
}

// AI 분석 결과를 검색 조건으로 변환
function buildSearchCriteriaFromAnalysis(analysis, userPreferences, currentHour) {
    const criteria = {
        timeHour: currentHour
    };
    
    // AI 분석에서 추출된 정보 사용
    const extractedInfo = analysis.extractedInfo || {};
    const context = analysis.context || {};
    
    // 지역 정보 (더 적극적인 기억 활용)
    if (extractedInfo.preferredArea) {
        criteria.area = extractedInfo.preferredArea;
    } else if (userPreferences.lastVisitedArea && 
               (context.locationIntent === 'flexible' || 
                context.locationIntent === 'unknown' || 
                !context.locationIntent)) {
        // 이전에 언급한 지역을 기본값으로 사용
        criteria.area = userPreferences.lastVisitedArea;
        console.log(`🏖️ 이전 대화에서 언급한 지역 활용: ${criteria.area}`);
    }
    
    // 음식 카테고리
    if (extractedInfo.foodCategory) {
        criteria.category = extractedInfo.foodCategory;
    } else if (userPreferences.preferredCategories.length > 0) {
        criteria.category = userPreferences.preferredCategories[0];
    }
    
    // 특정 음식 키워드
    if (extractedInfo.specificFood) {
        criteria.keyword = extractedInfo.specificFood;
    } else if (extractedInfo.keywords && extractedInfo.keywords.length > 0) {
        criteria.keyword = extractedInfo.keywords[0];
    }
    
    // 시간대별 추론
    const timePreference = context.timePreference;
    if (timePreference && timePreference !== 'flexible') {
        const timeHourMap = {
            'breakfast': 9,
            'lunch': 12,
            'snack': 16,
            'dinner': 19,
            'late_night': 23
        };
        
        if (timeHourMap[timePreference]) {
            criteria.timeHour = timeHourMap[timePreference];
        }
    }
    
    // 예산 고려사항
    if (context.budgetConcern === 'budget' || userPreferences.priceRange === 'budget') {
        criteria.priceRange = 'budget';
        criteria.minRating = 3.5; // 가성비 중심이므로 평점 기준 낮춤
    } else if (context.budgetConcern === 'premium') {
        criteria.priceRange = 'premium';
        criteria.minRating = 4.3; // 고급 맛집이므로 평점 기준 높임
    } else {
        criteria.minRating = 4.0; // 기본 평점 기준
    }
    
    // 분위기 고려사항
    if (context.atmospherePreference) {
        criteria.atmosphere = context.atmospherePreference;
    }
    
    // 사회적 맥락 고려
    if (context.socialContext === 'date') {
        criteria.atmosphere = 'fancy';
        criteria.minRating = 4.2;
    } else if (context.socialContext === 'with_friends') {
        criteria.atmosphere = 'lively';
    }
    
    // 위치 정보 필요 여부 판단
    criteria.needsLocationClarification = analysis.conversationFlow?.needsMoreInfo && 
                                        !extractedInfo.preferredArea && 
                                        !userPreferences.lastVisitedArea &&
                                        context.locationIntent === 'unknown';
    
    // 긴급도에 따른 추천 개수 조정
    if (analysis.urgency === 'high') {
        criteria.limit = 3; // 빠른 추천을 위해 3개만
    } else {
        criteria.limit = 6; // 일반적으로 6개
    }
    
    return criteria;
}

export default async function handler(req, res) {
    // CORS 설정
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting 체크
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIP)) {
        return res.status(429).json({ 
            error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.',
            retryAfter: 60
        });
    }

    const { message, sessionId = 'anonymous_' + Date.now() } = req.body || {};

    if (!message) {
        return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    // 메모리 정리 실행 (확률적으로)
    if (Math.random() < 0.1) { // 10% 확률로 정리 실행
        cleanupMemory();
    }

    // 세션별 대화 기록 가져오기
    const sessionData = getConversationHistory(sessionId);
    
    // 사용자 메시지를 대화 기록에 추가
    addToConversationHistory(sessionId, message, 'user');
    
    console.log(`📝 현재 세션 선호도:`, {
        preferredAreas: sessionData.userPreferences.preferredAreas,
        lastVisitedArea: sessionData.userPreferences.lastVisitedArea,
        preferredCategories: sessionData.userPreferences.preferredCategories
    });

    // 현재 한국 시간 정보
    const now = new Date();
    const koreaDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
    const currentHour = koreaDate.getHours();
    const koreaTime = new Intl.DateTimeFormat('ko-KR', { 
        timeZone: 'Asia/Seoul', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).format(koreaDate);
    
    console.log(`현재 한국 시간: ${currentHour}시 (${koreaTime})`);

    // AI 기반 대화 분석
    console.log('🤖 AI 대화 분석 시작...');
    const conversationAnalysis = await conversationAnalyzer.analyzeConversation(
        message, 
        sessionData.messages,
        sessionData.userPreferences
    );
    
    console.log('분석 결과:', JSON.stringify(conversationAnalysis, null, 2));
    
    // 분석 결과를 기반으로 의도 파악
    const isCasualChat = conversationAnalysis.intent === 'greeting' || 
                        conversationAnalysis.intent === 'emotion' || 
                        conversationAnalysis.intent === 'general';
    const isRestaurantRequest = conversationAnalysis.intent === 'restaurant_recommendation';
    
    // 일상 대화인 경우 맛집 검색하지 않고 자연스러운 대화
    if (isCasualChat && !isRestaurantRequest) {
        try {
            const casualResponse = await callClaudeAPI(message, [], currentHour, '', 'casual', sessionData, conversationAnalysis);
            addToConversationHistory(sessionId, casualResponse, 'assistant');
            
            return res.status(200).json({
                response: casualResponse,
                restaurants: [], // 일상 대화이므로 맛집 카드 없음
                conversationType: 'casual',
                currentTime: koreaTime,
                success: true,
                source: 'claude_casual'
            });
        } catch (error) {
            // 일상 대화 fallback
            const casualFallback = generateCasualResponse(message, conversationAnalysis);
            addToConversationHistory(sessionId, casualFallback, 'assistant');
            
            return res.status(200).json({
                response: casualFallback,
                restaurants: [],
                conversationType: 'casual',
                currentTime: koreaTime,
                success: true,
                source: 'casual_fallback'
            });
        }
    }
    
    // AI 분석 결과를 기반으로 검색 조건 생성
    const searchCriteria = buildSearchCriteriaFromAnalysis(conversationAnalysis, sessionData.userPreferences, currentHour);
    
    console.log('생성된 검색 조건:', JSON.stringify(searchCriteria, null, 2));
    
    // 위치 정보 없는 일반적인 음식 질문인 경우 위치를 먼저 물어봄
    if (searchCriteria.needsLocationClarification) {
        const timeBasedRec = visitBusanService.getTimeBasedRecommendations(currentHour);
        const locationInquiryMessage = visitBusanService.getLocationInquiryMessage(timeBasedRec.mealType, currentHour);
        
        return res.status(200).json({
            response: locationInquiryMessage,
            restaurants: [], // 위치 선택 전이므로 빈 배열
            timeMessage: timeBasedRec.message,
            currentTime: koreaTime,
            mealType: timeBasedRec.mealType,
            needsLocation: true,
            conversationType: 'restaurant',
            success: true,
            source: 'location_inquiry'
        });
    }
    
    const matchedRestaurants = visitBusanService.findRestaurants(searchCriteria);
    
    // 시간대별 추천 메시지 생성
    const timeBasedRec = visitBusanService.getTimeBasedRecommendations(currentHour);
    const timeMessage = timeBasedRec.message;

    // Claude API 사용 시도 (더 세심한 에러 처리)
    try {
        const claudeResponse = await callClaudeAPI(message, matchedRestaurants, currentHour, timeMessage, 'restaurant', sessionData, conversationAnalysis);
        addToConversationHistory(sessionId, claudeResponse, 'assistant');
        
        return res.status(200).json({
            response: claudeResponse,
            restaurants: matchedRestaurants.slice(0, 6), // 최대 6개 카드
            timeMessage: timeMessage,
            currentTime: koreaTime,
            mealType: timeBasedRec.mealType,
            success: true,
            source: 'claude'
        });
    } catch (error) {
        console.log('Claude API 실패:', error.message);
        
        // Rate limit 에러 체크
        if (error.message.includes('429') || error.message.includes('rate')) {
            console.log('Rate limit 감지됨');
        }
        
        // Billing 에러 체크  
        if (error.message.includes('400') || error.message.includes('credit')) {
            console.log('Billing 문제 감지됨');
        }
        
        // 실패시 기본 응답 사용
        const fallbackResponse = generateSimpleResponse(message, matchedRestaurants, timeMessage, searchCriteria.needsLocationClarification);
        addToConversationHistory(sessionId, fallbackResponse, 'assistant');
        
        return res.status(200).json({
            response: fallbackResponse,
            restaurants: searchCriteria.needsLocationClarification ? [] : matchedRestaurants.slice(0, 6),
            timeMessage: timeMessage,
            currentTime: koreaTime,
            mealType: timeBasedRec.mealType,
            needsLocation: searchCriteria.needsLocationClarification,
            success: true,
            source: 'fallback',
            error: error.message
        });
    }
}

async function callClaudeAPI(message, matchedRestaurants = [], currentHour = new Date().getHours(), timeMessage = '', conversationType = 'restaurant', sessionData = null, conversationAnalysis = null, retryCount = 0) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        throw new Error('Claude API 키가 설정되지 않았습니다.');
    }

    // Vercel 환경에서 호환성을 위해 https 모듈 사용  
    const { default: https } = await import('https');
    
    let restaurantContext = '';
    if (matchedRestaurants.length > 0) {
        restaurantContext = '\n\n비짓부산에서 찾은 맛집들:\n' + matchedRestaurants.map(r => 
            `- ${r.name} (${r.area})
  📍 주소: ${r.address}
  ${r.description}${r.menu ? ', 대표메뉴: ' + r.menu : ''}${r.rating > 0 ? ', 평점: ' + r.rating + '점' : ''}${r.phone ? ', 전화: ' + r.phone : ''}`
        ).join('\n\n');
    }
    
    // 대화 컨텍스트 생성
    let conversationContext = '';
    if (sessionData && sessionData.messages.length > 0) {
        const recentMessages = sessionData.messages.slice(-6); // 최근 6개 메시지만 사용
        conversationContext = '\n\n최근 대화 내용:\n' + recentMessages.map(msg => 
            `${msg.role === 'user' ? '사용자' : '뚜기'}: ${msg.content}`
        ).join('\n');
    }
    
    // 사용자 선호도 정보 생성
    let preferencesContext = '';
    if (sessionData && sessionData.userPreferences) {
        const prefs = sessionData.userPreferences;
        let prefInfo = [];
        
        if (prefs.preferredAreas.length > 0) {
            prefInfo.push(`선호 지역: ${prefs.preferredAreas.join(', ')}`);
        }
        if (prefs.preferredCategories.length > 0) {
            prefInfo.push(`선호 음식: ${prefs.preferredCategories.join(', ')}`);
        }
        if (prefs.lastVisitedArea) {
            prefInfo.push(`최근 관심 지역: ${prefs.lastVisitedArea}`);
        }
        if (prefs.priceRange) {
            prefInfo.push(`가격 선호도: ${prefs.priceRange === 'budget' ? '가성비' : '고급'}`);
        }
        
        if (prefInfo.length > 0) {
            preferencesContext = '\n\n사용자 선호도 정보:\n' + prefInfo.join('\n');
        }
    }
    
    // AI 분석 컨텍스트 생성
    let analysisContext = '';
    if (conversationAnalysis) {
        let analysisInfo = [];
        
        if (conversationAnalysis.context) {
            const ctx = conversationAnalysis.context;
            if (ctx.mood && ctx.mood !== 'neutral') {
                analysisInfo.push(`현재 기분: ${ctx.mood}`);
            }
            if (ctx.socialContext && ctx.socialContext !== 'alone') {
                analysisInfo.push(`동행: ${ctx.socialContext === 'date' ? '연인' : ctx.socialContext === 'with_friends' ? '친구들' : ctx.socialContext === 'family' ? '가족' : ctx.socialContext}`);
            }
            if (ctx.urgency && ctx.urgency === 'high') {
                analysisInfo.push(`급함: 빠른 추천 필요`);
            }
            if (ctx.atmospherePreference && ctx.atmospherePreference !== 'casual') {
                analysisInfo.push(`원하는 분위기: ${ctx.atmospherePreference}`);
            }
        }
        
        if (conversationAnalysis.emotions && conversationAnalysis.emotions.length > 0) {
            analysisInfo.push(`감정 상태: ${conversationAnalysis.emotions.join(', ')}`);
        }
        
        if (analysisInfo.length > 0) {
            analysisContext = '\n\n상황 분석:\n' + analysisInfo.join('\n');
        }
    }

    let promptContent = '';
    
    if (conversationType === 'casual') {
        // 일상 대화 프롬프트
        promptContent = `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마
- 친근하고 재미있는 부산 사람

대화 방식:
- 자연스러운 일상 대화를 나눠
- 상대방에게 관심을 보이고 친근하게 대화해
- 이전 대화 내용을 기억하고 연결지어서 대화해
- 맛집이나 음식 관련 질문이 아니면 맛집을 추천하지 말고 일반 대화를 해
- 핵심을 잘 파악하고 간결하게 대답해

응답 규칙:
- 항상 한국어로 답변하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 일상적인 주제로 자연스럽게 대화해
- 상황과 감정을 잘 파악해서 맞춤형 응답을 해줘${conversationContext}${preferencesContext}${analysisContext}

사용자 질문: ${message}`;
    } else {
        // 맛집 추천 프롬프트
        promptContent = `너 이름은 뚜기야, 부산 현지인이야.

특징:
- 부산의 로컬 맛집과 숨은 맛집들을 잘 알고 있어
- 부산 사투리를 조금 써 
- 상남자 스타일이야
- ~~ 아이가?, 있다이가 ~~, ~~ 해봐라 같은 문장을 써줘
- ~~노, ~~카이 같은 문장은 쓰지마

현재 상황:
- 현재 시간: ${currentHour}시
- 시간대 메시지: ${timeMessage}

대화 방식:
- 이전 대화 내용과 사용자 선호도를 기억하고 반영해서 추천해
- 현재 시간대에 맞는 음식을 우선 추천해
- 자연스러운 대화를 통해 사용자의 취향과 상황을 파악해
- 맛집을 추천할 때는 대화 흐름에 맞춰서 적절한 시점에 추천해
- 사용자가 지역이나 음식 종류를 언급하면 그에 맞는 맛집을 자연스럽게 추천해
- 핵심을 잘 파악하고 간결하게 대답해
- 맛집을 추천할 때는 반드시 주소도 함께 알려줘

응답 규칙:
- 항상 한국어로 답변하세요
- 말을 시작할 때 마! 라고 시작하고 항상 반말로 대화해
- 현재 시간대를 고려한 맛집을 소개하세요
- 맛집 이름과 함께 정확한 주소 정보를 포함하세요
- 사용자의 상황과 감정, 동행자를 고려해서 맞춤형 추천을 해줘${restaurantContext}${conversationContext}${preferencesContext}${analysisContext}

사용자 질문: ${message}`;
    }
    
    const postData = JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        messages: [{
            role: 'user',
            content: promptContent
        }]
    });

    const options = {
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        timeout: 15000, // 15초 타임아웃
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Length': Buffer.byteLength(postData),
            'User-Agent': 'Claude-Dduki-Bot/1.0',
            'Accept': 'application/json'
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                try {
                    console.log(`Claude API 응답 상태: ${res.statusCode}`);
                    
                    if (res.statusCode === 429) {
                        // Rate limit - 잠시 후 재시도
                        if (retryCount < 2) {
                            console.log(`Rate limit 감지, ${retryCount + 1}번째 재시도...`);
                            setTimeout(() => {
                                callClaudeAPI(message, retryCount + 1)
                                    .then(resolve)
                                    .catch(reject);
                            }, 2000 * (retryCount + 1)); // 점진적 백오프
                            return;
                        }
                        reject(new Error(`Rate limit 초과: ${data}`));
                        return;
                    }
                    
                    if (res.statusCode === 400) {
                        console.log('API 키 또는 billing 문제 가능성:', data);
                        reject(new Error(`Billing/API 키 문제: ${data}`));
                        return;
                    }
                    
                    if (res.statusCode !== 200) {
                        reject(new Error(`Claude API 오류: ${res.statusCode} - ${data}`));
                        return;
                    }
                    
                    const response = JSON.parse(data);
                    console.log('Claude API 성공!');
                    resolve(response.content[0].text);
                } catch (error) {
                    reject(new Error(`응답 파싱 오류: ${error.message}`));
                }
            });
        });

        req.on('timeout', () => {
            req.destroy();
            reject(new Error('요청 타임아웃'));
        });

        req.on('error', (error) => {
            reject(new Error(`네트워크 오류: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
}

function generateSimpleResponse(message, matchedRestaurants = [], timeMessage = '', needsLocation = false) {
    const lowerMessage = message.toLowerCase();
    const currentHour = new Date().getHours();
    
    // 위치 정보가 필요한 경우  
    if (needsLocation) {
        return `마! 뚜기다이가! 🐧

니 지금 어디 갈건데?!

 해운대/센텀 - 바다 보면서 먹기 좋은 곳
 서면 - 부산의 중심가, 다양한 맛집  
 남포동/자갈치 - 전통시장과 문화거리
 광안리 - 야경 맛집의 성지
 부산대/장전동 - 젊은 분위기의 맛집들
 강서구 - 공항 근처 숨은 맛집
 동래 - 전통과 역사가 있는 맛집들
 기장 - 신선한 해산물과 자연
`;
    }
    
    // 시간대 인사말 먼저
    let greeting = timeMessage || `마! 뚜기다이가! 🐧`;
    
    // 맛집 데이터가 있으면 사용
    if (matchedRestaurants.length > 0) {
        const restaurant = matchedRestaurants[0];
        const ratingText = restaurant.rating > 0 ? `⭐ ${restaurant.rating}점` : '';
        const menuText = restaurant.menu ? `🍽️ ${restaurant.menu}` : '';
        const phoneText = restaurant.phone ? `📞 ${restaurant.phone}` : '';
        
        return `${greeting}

${restaurant.area}에서 ${restaurant.category} 맛집 찾았다!

🍜 **${restaurant.name}**
📍 ${restaurant.address}
${menuText}
${phoneText}
${ratingText}
✨ ${restaurant.description}

이 집 진짜 맛있다 아이가! `;
    }
    
    // 키워드별 간단한 응답
    if (lowerMessage.includes('돼지국밥')) {
        return `마! 뚜기다이가! 🐧

돼지국밥이라 카네! 부산 왔으면 돼지국밥이제

🍜 부산에는 돼지국밥 맛집이 진짜 많다!
서면, 남포동, 해운대 어디든 맛있는 곳이 있어.

어느 동네서 먹고 싶나? 더 구체적으로 말해봐라!`;
    }
    
    if (lowerMessage.includes('해운대')) {
        return `마! 뚜기다이가! 🐧

해운대라 카네! 바다 보면서 맛있는 거 먹으면 기분이 째질 거다!

🏖️ 해운대는 갈비, 회, 칼국수 다 맛있어.
특히 바다 앞에서 먹는 음식은 뭔가 더 맛있다 아이가?

뭘 먹고 싶은지 말해봐라!`;
    }
    
    // 기본 응답
    return `마! 뚜기다이가! 🐧

부산 맛집이라 카면 내가 진짜 잘 안다!

이런 거 물어봐라:
• "돼지국밥 맛집 추천해줘"
• "해운대에서 갈비 먹고 싶어"  
• "남포동 회집 어디가 좋아?"

뭘 먹고 싶은지 말해봐~ 😊`;
}

function generateCasualResponse(message, conversationAnalysis = null) {
    const lowerMessage = message.toLowerCase();
    
    // AI 분석 결과를 활용한 맞춤형 응답
    if (conversationAnalysis) {
        const mood = conversationAnalysis.context?.mood;
        const emotions = conversationAnalysis.emotions || [];
        
        // 감정 상태에 맞는 응답
        if (emotions.includes('hungry')) {
            return `마! 배고프구나! 🤤
            
뭔가 맛있는 거 먹고 싶나? 
부산에 맛집이 진짜 많은데, 뭘 먹을지 말해봐라!`;
        }
        
        if (emotions.includes('tired')) {
            return `마! 많이 피곤하구나... 😴
            
부산 와서 돌아다니느라 힘들었지?
편하게 쉴 수 있는 카페나 든든한 음식 먹고 힘내봐라!`;
        }
        
        if (emotions.includes('excited')) {
            return `마! 기분 좋아 보이네! 😄
            
부산 여행 재미있지? 뭔가 특별한 걸 찾고 있나?
신나는 기분에 맛있는 거 하나 추천해줄까?`;
        }
        
        // 동행자에 따른 응답
        if (conversationAnalysis.context?.socialContext === 'date') {
            return `마! 연인이랑 왔구나! 💕
            
부산에서 데이트하기 좋은 곳들이 많아!
분위기 좋은 맛집이나 카페 찾고 있으면 말해봐라~`;
        }
    }
    
    // 인사 응답
    if (lowerMessage.includes('안녕') || lowerMessage.includes('하이')) {
        return `마! 뚜기다이가! 🐧

반갑다! 부산 어딘지 궁금하네~
오늘 하루는 어땠어?`;
    }
    
    // 이름 관련
    if (lowerMessage.includes('이름') || lowerMessage.includes('누구')) {
        return `마! 내 이름은 뚜기다! 🐧

부산 토박이고 이 동네 구석구석 다 안다이가!
맛집 얘기하면 나한테 물어봐라~`;
    }
    
    // 날씨 관련
    if (lowerMessage.includes('날씨') || lowerMessage.includes('비') || lowerMessage.includes('더워') || lowerMessage.includes('추워')) {
        return `마! 부산 날씨 얘기하네? 🌤️

부산은 바다가 있어서 그런지 날씨가 변덕스러워!
그래도 다른 데보다는 살 만하다 아이가?`;
    }
    
    // 감정 표현
    if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
        return `마! 뭘 고마워하노! 😊

부산 사람은 원래 정이 많다카이~
또 궁금한 거 있으면 언제든 말해라!`;
    }
    
    if (lowerMessage.includes('미안') || lowerMessage.includes('죄송')) {
        return `마! 뭘 미안해하노! 🤗

부산 사람끼리 그런 거 없다!
편하게 얘기해라~`;
    }
    
    // 기본 일상 대화
    return `마! 뚜기다이가! 🐧

부산 살이는 어때? 재미있지?
뭔가 궁금한 거 있으면 말해봐라! 😄`;
}