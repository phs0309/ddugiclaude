const visitBusanService = require('./visitBusanService.cjs');

// Rate limiting
const requestCounts = new Map();
const RATE_LIMIT = 10;
const WINDOW_MS = 60 * 1000;

function checkRateLimit(ip) {
    const now = Date.now();
    const windowStart = now - WINDOW_MS;
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return false;
    }
    
    recentRequests.push(now);
    requestCounts.set(ip, recentRequests);
    return true;
}

module.exports = async function handler(req, res) {
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

    // Rate limiting
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

    console.log(`💬 새로운 메시지: "${message}" (세션: ${sessionId})`);

    try {
        // 키워드 기반 분석으로 맛집 요청 처리
        const criteria = visitBusanService.analyzeUserQuery(message);
        console.log('🔍 분석된 조건:', criteria);

        // 맛집 관련 요청인지 확인
        const isRestaurantRequest = isRestaurantQuery(message);
        
        if (isRestaurantRequest) {
            // 맛집 검색 실행
            const restaurants = visitBusanService.findRestaurants(criteria);
            console.log(`📍 찾은 맛집 수: ${restaurants.length}개`);

            // Claude AI로 응답 생성
            const aiResponse = await generateClaudeResponse(message, restaurants, criteria);

            return res.status(200).json({
                response: aiResponse,
                restaurants: restaurants.slice(0, 6),
                conversationType: 'restaurant_recommendation',
                currentTime: getCurrentKoreaTime(),
                success: true,
                source: 'keyword_based_with_ai'
            });
        } else {
            // 일반 대화 - Claude AI로 처리
            const casualResponse = await generateCasualResponse(message);
            
            return res.status(200).json({
                response: casualResponse,
                restaurants: [],
                conversationType: 'casual',
                currentTime: getCurrentKoreaTime(),
                success: true,
                source: 'casual_conversation'
            });
        }

    } catch (error) {
        console.error('대화 처리 오류:', error);
        
        return res.status(200).json({
            response: `마! 미안하다... 😅\n\n잠깐 머리가 하얘졌네. 다시 말해봐라!`,
            restaurants: [],
            conversationType: 'error',
            success: true,
            source: 'error_fallback'
        });
    }
};

// 맛집 요청인지 키워드로 판단
function isRestaurantQuery(message) {
    const lowerMessage = message.toLowerCase();
    
    // 맛집 관련 키워드
    const restaurantKeywords = [
        '맛집', '식당', '먹을', '추천', '알려줘', '소개', '찾아줘',
        '어디', '가자', '가고싶어', '먹고싶어', '먹을까', '어떨까',
        '점심', '저녁', '아침', '간식', '야식', '브런치'
    ];
    
    // 음식 키워드
    const foodKeywords = [
        '돼지국밥', '밀면', '회', '갈비', '치킨', '족발', '곱창',
        '국밥', '면', '파스타', '피자', '초밥', '삼겹살', '냉면',
        '커피', '카페', '디저트', '케이크', '떡볶이', '김밥'
    ];
    
    // 지역 키워드
    const areaKeywords = [
        '해운대', '센텀', '서면', '남포동', '광안리', '기장',
        '동래', '부산대', '장전동', '사직', '덕천'
    ];
    
    return restaurantKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           foodKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           (areaKeywords.some(keyword => lowerMessage.includes(keyword)) && 
            (lowerMessage.includes('먹') || lowerMessage.includes('맛')));
}

// Claude AI로 맛집 추천 응답 생성
async function generateClaudeResponse(message, restaurants, criteria) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        return generateFallbackRestaurantResponse(restaurants, criteria);
    }

    try {
        const https = require('https');
        
        const restaurantInfo = restaurants.slice(0, 6).map((r, idx) => 
            `${idx + 1}. ${r.name} (${r.area})\n   ${r.address}\n   평점: ${r.rating}/5 (${r.reviewCount}개 리뷰)\n   ${r.description}`
        ).join('\n\n');

        const prompt = `너는 뚜기야, 부산 현지인이고 맛집 전문가야. 부산 사투리를 조금 써서 친근하게 대답해줘.

사용자 요청: "${message}"

찾은 맛집들:
${restaurantInfo}

위 맛집들을 바탕으로 2-3문장 정도로 간단하고 친근하게 추천해줘. 
맛집 카드는 따로 보여주니까 구체적인 이름이나 주소는 반복하지 마.
"~다이가", "~아이가", "~해봐라" 같은 부산 사투리를 자연스럽게 써줘.`;

        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
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
            timeout: 15000,
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
                            resolve(generateFallbackRestaurantResponse(restaurants, criteria));
                            return;
                        }
                        
                        const response = JSON.parse(data);
                        const aiText = response.content[0].text;
                        resolve(aiText);
                        
                    } catch (error) {
                        resolve(generateFallbackRestaurantResponse(restaurants, criteria));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(generateFallbackRestaurantResponse(restaurants, criteria));
            });

            req.on('error', () => {
                resolve(generateFallbackRestaurantResponse(restaurants, criteria));
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        return generateFallbackRestaurantResponse(restaurants, criteria);
    }
}

// 일반 대화용 Claude AI 응답
async function generateCasualResponse(message) {
    const apiKey = process.env.CLAUDE_API_KEY;
    
    if (!apiKey) {
        return generateSimpleCasualResponse(message);
    }

    try {
        const https = require('https');
        
        const prompt = `너는 뚜기야, 부산 현지인이야. 부산 사투리를 조금 써서 친근하게 대화해줘.

사용자: "${message}"

부산 사투리 ("~다이가", "~아이가", "~해봐라")를 자연스럽게 써서 1-2문장으로 간단하게 대답해줘.`;

        const postData = JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
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
                            resolve(generateSimpleCasualResponse(message));
                            return;
                        }
                        
                        const response = JSON.parse(data);
                        const aiText = response.content[0].text;
                        resolve(aiText);
                        
                    } catch (error) {
                        resolve(generateSimpleCasualResponse(message));
                    }
                });
            });

            req.on('timeout', () => {
                req.destroy();
                resolve(generateSimpleCasualResponse(message));
            });

            req.on('error', () => {
                resolve(generateSimpleCasualResponse(message));
            });

            req.write(postData);
            req.end();
        });

    } catch (error) {
        return generateSimpleCasualResponse(message);
    }
}

// Fallback 맛집 응답
function generateFallbackRestaurantResponse(restaurants, criteria) {
    if (restaurants.length === 0) {
        return `마! 그 조건으론 맛집을 못 찾겠네... 😅\n\n다른 지역이나 음식으로 다시 말해봐라!`;
    }
    
    const area = criteria.area || '부산';
    const keyword = criteria.keyword || criteria.category || '맛집';
    
    return `마! ${area}에서 ${keyword} 맛집들 찾았다이가! 🐧\n\n아래 카드들 확인해봐라~ 다 맛있는 곳들이야!`;
}

// Fallback 일반 대화 응답
function generateSimpleCasualResponse(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('안녕') || lowerMessage.includes('하이')) {
        return `마! 뚜기다이가! 🐧 반갑다!`;
    }
    
    if (lowerMessage.includes('고마') || lowerMessage.includes('감사')) {
        return `마! 뭘 고마워하노! 😊`;
    }
    
    if (lowerMessage.includes('어떻게') || lowerMessage.includes('어때')) {
        return `마! 좋다이가! 😄 또 뭔 얘기할까?`;
    }
    
    return `마! 뚜기다이가! 🐧 뭔 얘기할까?`;
}

// 한국 시간 가져오기
function getCurrentKoreaTime() {
    const now = new Date();
    return new Intl.DateTimeFormat('ko-KR', { 
        timeZone: 'Asia/Seoul', 
        hour: '2-digit', 
        minute: '2-digit' 
    }).format(now);
}