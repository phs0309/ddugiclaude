// 순수 AI 기반 대화 관리자 - 키워드 분석 완전 제거
class AIConversationManager {
    constructor() {
        this.conversationMemory = new Map();
        this.MAX_MEMORY_ENTRIES = 100;
        this.MAX_CONVERSATION_LENGTH = 15;
        this.MEMORY_CLEANUP_INTERVAL = 60 * 60 * 1000; // 1시간
    }

    // 메모리 관리
    getConversationHistory(sessionId) {
        if (!this.conversationMemory.has(sessionId)) {
            this.conversationMemory.set(sessionId, {
                messages: [],
                userContext: {
                    name: null,
                    preferences: {},
                    currentMood: null,
                    lastInteractionTime: Date.now()
                },
                lastActivity: Date.now()
            });
        }
        
        const sessionData = this.conversationMemory.get(sessionId);
        sessionData.lastActivity = Date.now();
        return sessionData;
    }

    addToConversationHistory(sessionId, message, role) {
        const sessionData = this.getConversationHistory(sessionId);
        
        sessionData.messages.push({
            role: role,
            content: message,
            timestamp: Date.now()
        });
        
        // 대화 길이 제한
        if (sessionData.messages.length > this.MAX_CONVERSATION_LENGTH) {
            sessionData.messages = sessionData.messages.slice(-this.MAX_CONVERSATION_LENGTH);
        }
    }

    // 순수 AI 기반 대화 처리
    async handleConversation(message, sessionId, restaurantData = []) {
        const sessionData = this.getConversationHistory(sessionId);
        
        // 사용자 메시지 추가
        this.addToConversationHistory(sessionId, message, 'user');
        
        // 현재 한국 시간
        const now = new Date();
        const koreaDate = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Seoul"}));
        const currentHour = koreaDate.getHours();
        const koreaTime = new Intl.DateTimeFormat('ko-KR', { 
            timeZone: 'Asia/Seoul', 
            hour: '2-digit', 
            minute: '2-digit' 
        }).format(koreaDate);

        try {
            // Claude AI가 모든 것을 결정 - 대화 의도, 맛집 추천 여부, 응답 내용
            const aiResponse = await this.callClaudeForFullConversation(
                message, 
                sessionData, 
                currentHour, 
                koreaTime,
                restaurantData
            );

            // AI 응답을 대화 기록에 추가
            this.addToConversationHistory(sessionId, aiResponse.response, 'assistant');

            return {
                response: aiResponse.response,
                restaurants: aiResponse.restaurants || [],
                needsRestaurantData: aiResponse.needsRestaurantData || false,
                searchQuery: aiResponse.searchQuery || null,
                conversationType: aiResponse.conversationType || 'general',
                currentTime: koreaTime,
                success: true,
                source: 'ai_managed'
            };

        } catch (error) {
            console.log('AI 대화 처리 실패:', error.message);
            
            // 간단한 fallback
            const fallbackResponse = this.generateSimpleFallback(message, sessionData);
            this.addToConversationHistory(sessionId, fallbackResponse, 'assistant');
            
            return {
                response: fallbackResponse,
                restaurants: [],
                currentTime: koreaTime,
                success: true,
                source: 'fallback'
            };
        }
    }

    async callClaudeForFullConversation(message, sessionData, currentHour, koreaTime, restaurantData) {
        const apiKey = process.env.CLAUDE_API_KEY;
        
        if (!apiKey) {
            throw new Error('Claude API 키가 설정되지 않았습니다.');
        }

        // 대화 컨텍스트 구성
        let conversationContext = '';
        if (sessionData.messages.length > 0) {
            const recentMessages = sessionData.messages.slice(-8);
            conversationContext = recentMessages.map(msg => 
                `${msg.role === 'user' ? '사용자' : '뚜기'}: ${msg.content}`
            ).join('\n');
        }

        // 맛집 데이터 컨텍스트
        let restaurantContext = '';
        if (restaurantData.length > 0) {
            restaurantContext = '\n\n찾은 맛집 정보:\n' + 
                restaurantData.slice(0, 6).map((r, idx) => 
                    `${idx + 1}. ${r.name} (${r.area})\n   ${r.address}\n   ${r.description}`
                ).join('\n\n');
        }

        const prompt = `너는 뚜기야, 부산 현지인이고 맛집 전문가야.

**중요한 역할:**
1. 자연스러운 대화를 이어가는 것이 최우선이야
2. 사용자가 명확히 맛집을 요청할 때만 추천해줘
3. 일상 대화, 인사, 질문에는 자연스럽게 응답해줘
4. 같은 내용을 반복하지 마

**성격:**
- 부산 사투리를 조금 써 (~아이가?, ~다이가, ~해봐라)
- 친근하고 상남자 스타일, 말이 짧고 간결함
- 상황을 잘 파악하는 눈치 빠른 친구

**현재 상황:**
- 현재 시간: ${currentHour}시 (${koreaTime})
- 이전 대화 내용:
${conversationContext}

**응답 규칙:**
1. 사용자의 메시지를 정확히 이해하고 상황에 맞게 응답해
2. 맛집 관련 질문이 아니면 일반 대화로 응답해
3. **간결하고 짧게 대답해 - 길게 설명하지 마**
4. 맛집을 추천할 때만 아래 형식으로 응답해:

일반 대화일 때:
{
    "response": "짧고 간결한 대화 응답 (1-2문장)",
    "conversationType": "casual",
    "needsRestaurantData": false
}

맛집 추천이 필요할 때:
{
    "response": "간단한 맛집 추천 멘트 (맛집 카드는 별도로 표시되니까 간단히만)",
    "conversationType": "restaurant_recommendation", 
    "needsRestaurantData": true,
    "searchQuery": {
        "area": "지역명 또는 null",
        "category": "음식카테고리 또는 null", 
        "keyword": "특정음식 또는 null"
    }
}

**절대 하지 말아야 할 것:**
- 뜬금없는 맛집 추천
- 같은 내용 반복
- 대화 흐름과 맞지 않는 응답
- 키워드만 보고 판단하기
- 길고 장황한 설명 (항상 간결하게!)

**맛집 데이터 (참고용):**${restaurantContext}

사용자 메시지: "${message}"

**중요**: 맛집 추천 시에는 간단한 멘트만 하고, 상세한 맛집 정보(이름, 주소, 평점)는 별도 카드로 표시되니까 중복하지 마. JSON 형태로 응답해줘.`;

        // Vercel 환경에서 호환성을 위해 https 모듈 사용  
        const { default: https } = await import('https');
        
        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 1500,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const options = {
            hostname: 'api.anthropic.com',
            port: 443,
            path: '/v1/messages',
            method: 'POST',
            timeout: 20000,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Length': Buffer.byteLength(postData)
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
                        if (res.statusCode !== 200) {
                            reject(new Error(`Claude API 오류: ${res.statusCode}`));
                            return;
                        }
                        
                        const response = JSON.parse(data);
                        const aiText = response.content[0].text;
                        
                        // JSON 응답 파싱
                        const jsonMatch = aiText.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const aiResponse = JSON.parse(jsonMatch[0]);
                            resolve(aiResponse);
                        } else {
                            // JSON이 아니면 일반 텍스트 응답으로 처리
                            resolve({
                                response: aiText,
                                conversationType: 'casual',
                                needsRestaurantData: false
                            });
                        }
                        
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

    generateSimpleFallback(message, sessionData) {
        const lowerMessage = message.toLowerCase();
        
        // 간단한 인사 응답
        if (lowerMessage.includes('안녕') || lowerMessage.includes('하이')) {
            return `마! 뚜기다이가! 🐧 반갑다!`;
        }
        
        // 감사 인사
        if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
            return `마! 뭘 고마워하노! 😊`;
        }
        
        // 기본 응답
        return `마! 뚜기다이가! 🐧 뭔 얘기할까?`;
    }

    // 메모리 정리
    cleanupMemory() {
        const now = Date.now();
        for (const [sessionId, sessionData] of this.conversationMemory.entries()) {
            if (now - sessionData.lastActivity > this.MEMORY_CLEANUP_INTERVAL) {
                this.conversationMemory.delete(sessionId);
            }
        }
        
        if (this.conversationMemory.size > this.MAX_MEMORY_ENTRIES) {
            const sessions = Array.from(this.conversationMemory.entries())
                .sort((a, b) => a[1].lastActivity - b[1].lastActivity);
            
            const toRemove = sessions.slice(0, this.conversationMemory.size - this.MAX_MEMORY_ENTRIES);
            toRemove.forEach(([sessionId]) => this.conversationMemory.delete(sessionId));
        }
    }
}

export default AIConversationManager;