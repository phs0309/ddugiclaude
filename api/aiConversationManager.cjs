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

**⚠️ 절대적으로 지켜야 할 규칙 ⚠️**
1. 맛집 이름, 주소, 평점을 절대 지어내지 마라
2. 제공된 맛집 데이터에 없는 정보는 절대 말하지 마라  
3. 가짜 맛집을 만들어내는 것은 금지
4. 맛집 데이터가 없으면 데이터 검색이 필요하다고 해야 함

**대화 원칙:**
1. 이전 대화를 기억하고 자연스럽게 대화를 이어가라
2. 같은 말을 반복하지 마라 - 항상 새로운 관점으로 응답해
3. 대화 맥락을 파악해서 적절하게 응답해

**성격:**
- 부산 사투리를 조금 써 (~아이가?, ~다이가, ~해봐라)
- 친근하고 상남자 스타일, 말이 짧고 간결함
- 상황을 잘 파악하는 눈치 빠른 친구

**현재 상황:**
- 현재 시간: ${currentHour}시 (${koreaTime})
- 이전 대화:
${conversationContext}

**제공된 실제 맛집 데이터:**${restaurantContext}

사용자 메시지: "${message}"

**응답 지침:**
1. 맛집 데이터가 있으면 → 해당 데이터만 활용해서 간단한 소개 멘트
2. 맛집 데이터가 없고 맛집 요청이면 → needsRestaurantData: true로 데이터 요청
3. 일반 대화면 → 자연스럽게 대화 응답
4. **맛집 이름, 주소, 평점을 절대 지어내지 마라**

**응답 형식:**
일반 대화: {"response": "자연스러운 대화 응답", "conversationType": "casual", "needsRestaurantData": false}

맛집 추천 필요(데이터 없음): {"response": "맛집 검색할게!", "conversationType": "restaurant_recommendation", "needsRestaurantData": true, "searchQuery": {"area": "지역", "category": "카테고리", "keyword": "키워드"}}

맛집 데이터가 제공됨: {"response": "간단한 소개 멘트만 (구체적 정보는 카드에 표시)", "conversationType": "restaurant_recommendation", "restaurants": "provided"}

**절대 금지사항:**
- 가짜 맛집 이름 생성
- 가짜 주소 생성  
- 가짜 평점 생성
- 제공되지 않은 맛집 정보 언급
- 이전과 똑같은 응답

JSON만 응답해줘.`;

        // Vercel 환경에서 호환성을 위해 https 모듈 사용  
        const https = require('https');
        
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
        
        // 맛집 관련 질문인지 확인
        const isRestaurantQuery = lowerMessage.includes('맛집') || lowerMessage.includes('식당') || 
                                 lowerMessage.includes('먹을') || lowerMessage.includes('추천');
        
        if (isRestaurantQuery) {
            return `마! 맛집 찾고 있구나? 🐧 어느 동네에서 뭘 먹고 싶은지 말해봐라!`;
        }
        
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

module.exports = AIConversationManager;