// AI 기반 대화 분석 서비스
class ConversationAnalyzer {
    constructor() {
        this.contextCategories = {
            greetings: ['안녕', '하이', '반가', '처음', '안녕하세요'],
            mood: ['피곤', '배고파', '행복', '좋아', '기분', '스트레스', '힘들어'],
            time: ['아침', '점심', '저녁', '야식', '지금', '오늘', '내일'],
            location: ['어디', '근처', '주변', '가까운', '여기서', '거기서'],
            food: ['먹고싶어', '배고파', '맛있는', '추천', '메뉴', '음식'],
            social: ['친구', '가족', '연인', '혼자', '같이', '데이트'],
            budget: ['저렴', '비싸', '가성비', '돈', '예산', '부담'],
            atmosphere: ['분위기', '조용한', '시끄러운', '깔끔한', '편한']
        };
    }

    // AI를 사용해 사용자 의도와 컨텍스트 분석
    async analyzeConversation(message, conversationHistory = [], userPreferences = {}) {
        const analysisPrompt = this.buildAnalysisPrompt(message, conversationHistory, userPreferences);
        
        try {
            const analysis = await this.callClaudeForAnalysis(analysisPrompt);
            return this.parseAnalysisResult(analysis);
        } catch (error) {
            console.log('AI 분석 실패, 기본 분석 사용:', error.message);
            return this.fallbackAnalysis(message, conversationHistory, userPreferences);
        }
    }

    buildAnalysisPrompt(message, conversationHistory, userPreferences) {
        let prompt = `다음 대화를 분석해서 JSON 형태로 사용자의 의도를 파악해줘.

사용자 메시지: "${message}"

최근 대화 기록:
${conversationHistory.slice(-4).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

사용자 선호도:
${JSON.stringify(userPreferences, null, 2)}

다음 형태의 JSON으로 분석 결과를 반환해줘:
{
    "intent": "일상대화|맛집추천|위치질문|감정표현|인사|질문",
    "confidence": 0.8,
    "context": {
        "mood": "hungry|tired|happy|excited|neutral",
        "timePreference": "breakfast|lunch|dinner|snack|late_night|flexible",
        "socialContext": "alone|with_friends|date|family|work",
        "locationIntent": "specific|nearby|flexible|unknown",
        "budgetConcern": "budget|mid_range|premium|not_mentioned",
        "atmospherePreference": "quiet|lively|casual|fancy|outdoor"
    },
    "extractedInfo": {
        "preferredArea": "해운대|서면|남포동|광안리|기장|동래|etc",
        "foodCategory": "한식|해산물|양식|중식|일식|카페|etc",
        "specificFood": "돼지국밥|회|갈비|etc",
        "keywords": ["keyword1", "keyword2"]
    },
    "conversationFlow": {
        "needsMoreInfo": true/false,
        "suggestedQuestions": ["질문1", "질문2"],
        "responseType": "informative|recommendation|casual|question"
    },
    "emotions": ["happy", "excited", "hungry", "tired"],
    "urgency": "high|medium|low"
}

중요:
1. 대화의 자연스러운 흐름을 고려해서 분석해줘
2. 이전 대화 내용과의 연관성을 파악해줘 - 특히 지역 정보가 이전에 언급되었다면 현재 메시지에서도 그 지역을 고려해줘
3. 사용자가 명시적으로 말하지 않은 것도 문맥으로 추론해줘
4. 부산 지역과 음식 문화를 고려해서 분석해줘
5. **지역 정보 우선순위**: 현재 메시지에 지역이 없으면 이전 대화에서 언급된 지역을 preferredArea로 설정해줘
6. JSON 형태로만 응답하고 다른 설명은 하지 마세요`;

        return prompt;
    }

    async callClaudeForAnalysis(prompt) {
        const apiKey = process.env.CLAUDE_API_KEY;
        
        if (!apiKey) {
            throw new Error('Claude API 키가 없습니다');
        }

        // Vercel 환경에서 호환성을 위해 https 모듈 사용  
        const { default: https } = await import('https');
        
        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 800,
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
            timeout: 10000,
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
                        resolve(response.content[0].text);
                    } catch (error) {
                        reject(new Error(`응답 파싱 오류: ${error.message}`));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('분석 타임아웃'));
            });

            req.on('error', (error) => {
                reject(new Error(`네트워크 오류: ${error.message}`));
            });

            req.write(postData);
            req.end();
        });
    }

    parseAnalysisResult(analysisText) {
        try {
            // JSON 부분만 추출 (앞뒤 설명 제거)
            const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('JSON 형태가 아님');
        } catch (error) {
            console.log('AI 분석 결과 파싱 실패:', error.message);
            return this.getDefaultAnalysis();
        }
    }

    // AI 분석 실패시 사용할 기본 분석
    fallbackAnalysis(message, conversationHistory, userPreferences) {
        const lowerMessage = message.toLowerCase();
        
        // 기본 의도 분석
        let intent = 'general';
        if (this.isGreeting(lowerMessage)) intent = 'greeting';
        else if (this.isFoodRequest(lowerMessage)) intent = 'restaurant_recommendation';
        else if (this.isLocationQuestion(lowerMessage)) intent = 'location_question';
        else if (this.isEmotionalExpression(lowerMessage)) intent = 'emotion';

        // 컨텍스트 추론
        const context = this.inferContext(lowerMessage, conversationHistory, userPreferences);
        
        // 정보 추출
        const extractedInfo = this.extractInformation(lowerMessage, userPreferences);
        
        // 이전 대화에서 지역 정보 활용 (fallback에서도)
        if (!extractedInfo.preferredArea && userPreferences.lastVisitedArea) {
            // 음식 관련 요청이면서 지역이 명시되지 않은 경우, 이전 지역 사용
            if (intent === 'restaurant_recommendation') {
                extractedInfo.preferredArea = userPreferences.lastVisitedArea;
                console.log(`🏖️ Fallback: 이전 지역 정보 활용 - ${extractedInfo.preferredArea}`);
            }
        }

        return {
            intent,
            confidence: 0.6,
            context,
            extractedInfo,
            conversationFlow: {
                needsMoreInfo: intent === 'restaurant_recommendation' && !extractedInfo.preferredArea,
                suggestedQuestions: this.getSuggestedQuestions(intent, extractedInfo),
                responseType: this.getResponseType(intent)
            },
            emotions: this.detectEmotions(lowerMessage),
            urgency: this.assessUrgency(lowerMessage)
        };
    }

    isGreeting(message) {
        return this.contextCategories.greetings.some(word => message.includes(word));
    }

    isFoodRequest(message) {
        return this.contextCategories.food.some(word => message.includes(word)) ||
               message.includes('맛집') || message.includes('먹을');
    }

    isLocationQuestion(message) {
        return this.contextCategories.location.some(word => message.includes(word));
    }

    isEmotionalExpression(message) {
        return this.contextCategories.mood.some(word => message.includes(word));
    }

    inferContext(message, conversationHistory, userPreferences) {
        const now = new Date();
        const hour = now.getHours();
        
        return {
            mood: this.inferMood(message),
            timePreference: this.inferTimePreference(message, hour),
            socialContext: this.inferSocialContext(message, conversationHistory),
            locationIntent: this.inferLocationIntent(message, userPreferences),
            budgetConcern: this.inferBudgetConcern(message),
            atmospherePreference: this.inferAtmosphere(message)
        };
    }

    inferMood(message) {
        if (message.includes('배고파') || message.includes('먹고싶어')) return 'hungry';
        if (message.includes('피곤') || message.includes('힘들어')) return 'tired';
        if (message.includes('좋아') || message.includes('기분')) return 'happy';
        if (message.includes('설레') || message.includes('기대')) return 'excited';
        return 'neutral';
    }

    inferTimePreference(message, currentHour) {
        if (message.includes('아침')) return 'breakfast';
        if (message.includes('점심')) return 'lunch';
        if (message.includes('저녁')) return 'dinner';
        if (message.includes('야식') || message.includes('밤')) return 'late_night';
        if (message.includes('간식') || message.includes('디저트')) return 'snack';
        
        // 현재 시간에 따른 추론
        if (currentHour >= 6 && currentHour < 11) return 'breakfast';
        if (currentHour >= 11 && currentHour < 15) return 'lunch';
        if (currentHour >= 15 && currentHour < 18) return 'snack';
        if (currentHour >= 18 && currentHour < 22) return 'dinner';
        return 'late_night';
    }

    inferSocialContext(message, conversationHistory) {
        if (message.includes('친구') || message.includes('같이')) return 'with_friends';
        if (message.includes('가족')) return 'family';
        if (message.includes('연인') || message.includes('데이트')) return 'date';
        if (message.includes('회사') || message.includes('직장')) return 'work';
        if (message.includes('혼자')) return 'alone';
        
        // 대화 기록에서 추론
        const recentMessages = conversationHistory.slice(-3);
        for (const msg of recentMessages) {
            if (msg.content.includes('데이트') || msg.content.includes('연인')) return 'date';
            if (msg.content.includes('친구')) return 'with_friends';
        }
        
        return 'alone';
    }

    inferLocationIntent(message, userPreferences) {
        const areas = ['해운대', '서면', '남포동', '광안리', '기장', '동래'];
        if (areas.some(area => message.includes(area))) return 'specific';
        if (message.includes('근처') || message.includes('주변')) return 'nearby';
        if (userPreferences.lastVisitedArea) return 'flexible';
        return 'unknown';
    }

    inferBudgetConcern(message) {
        if (message.includes('저렴') || message.includes('가성비') || message.includes('싸')) return 'budget';
        if (message.includes('비싸') || message.includes('고급') || message.includes('특별')) return 'premium';
        return 'not_mentioned';
    }

    inferAtmosphere(message) {
        if (message.includes('조용') || message.includes('차분')) return 'quiet';
        if (message.includes('시끄러') || message.includes('활기')) return 'lively';
        if (message.includes('편한') || message.includes('캐주얼')) return 'casual';
        if (message.includes('고급') || message.includes('격식')) return 'fancy';
        if (message.includes('야외') || message.includes('테라스')) return 'outdoor';
        return 'casual';
    }

    extractInformation(message, userPreferences) {
        const areas = {
            '해운대': ['해운대', '센텀', '센텀시티'],
            '서면': ['서면', '부산진구'],
            '남포동': ['남포동', '자갈치', '중구'],
            '광안리': ['광안리', '광안', '수영구'],
            '기장': ['기장', '기장군'],
            '동래': ['동래', '동래구', '온천장'],
            '부산대': ['부산대', '장전동', '금정구'],
            '강서구': ['강서구', '김해공항'],
            '사하구': ['하단', '사하구'],
            '영도구': ['영도', '태종대'],
            '연제구': ['연산동', '연제구'],
            '북구': ['사직', '덕천', '북구']
        };

        const categories = {
            '한식': ['한식', '국밥', '갈비', '삼겹살'],
            '해산물': ['해산물', '회', '횟집'],
            '양식': ['양식', '파스타', '스테이크'],
            '중식': ['중식', '짜장면', '짬뽕'],
            '일식': ['일식', '초밥', '라멘'],
            '카페': ['카페', '커피', '디저트']
        };

        let preferredArea = null;
        let foodCategory = null;
        let specificFood = null;
        const keywords = [];

        // 지역 추출
        for (const [area, words] of Object.entries(areas)) {
            if (words.some(word => message.includes(word))) {
                preferredArea = area;
                break;
            }
        }

        // 음식 카테고리 추출
        for (const [category, words] of Object.entries(categories)) {
            if (words.some(word => message.includes(word))) {
                foodCategory = category;
                break;
            }
        }

        // 특정 음식 추출
        const foods = ['돼지국밥', '밀면', '회', '갈비', '치킨', '족발'];
        for (const food of foods) {
            if (message.includes(food)) {
                specificFood = food;
                keywords.push(food);
                break;
            }
        }

        return {
            preferredArea,
            foodCategory,
            specificFood,
            keywords
        };
    }

    getSuggestedQuestions(intent, extractedInfo) {
        if (intent === 'restaurant_recommendation') {
            if (!extractedInfo.preferredArea) {
                return ['어느 지역에서 드시고 싶으세요?', '어떤 음식이 땡기시나요?'];
            }
            if (!extractedInfo.foodCategory) {
                return ['어떤 종류의 음식을 원하시나요?', '특별히 먹고 싶은 메뉴가 있나요?'];
            }
        }
        return [];
    }

    getResponseType(intent) {
        switch (intent) {
            case 'greeting': return 'casual';
            case 'restaurant_recommendation': return 'recommendation';
            case 'location_question': return 'question';
            case 'emotion': return 'casual';
            default: return 'informative';
        }
    }

    detectEmotions(message) {
        const emotions = [];
        if (message.includes('좋아') || message.includes('기분')) emotions.push('happy');
        if (message.includes('배고파') || message.includes('먹고싶어')) emotions.push('hungry');
        if (message.includes('피곤') || message.includes('힘들어')) emotions.push('tired');
        if (message.includes('설레') || message.includes('기대')) emotions.push('excited');
        return emotions;
    }

    assessUrgency(message) {
        if (message.includes('급해') || message.includes('빨리') || message.includes('지금')) return 'high';
        if (message.includes('언제') || message.includes('나중에')) return 'low';
        return 'medium';
    }

    getDefaultAnalysis() {
        return {
            intent: 'general',
            confidence: 0.3,
            context: {
                mood: 'neutral',
                timePreference: 'flexible',
                socialContext: 'alone',
                locationIntent: 'unknown',
                budgetConcern: 'not_mentioned',
                atmospherePreference: 'casual'
            },
            extractedInfo: {
                preferredArea: null,
                foodCategory: null,
                specificFood: null,
                keywords: []
            },
            conversationFlow: {
                needsMoreInfo: true,
                suggestedQuestions: ['무엇을 도와드릴까요?'],
                responseType: 'casual'
            },
            emotions: [],
            urgency: 'medium'
        };
    }
}

export default ConversationAnalyzer;